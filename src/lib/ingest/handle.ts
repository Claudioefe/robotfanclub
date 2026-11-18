// Logic of POST /api/ingest/vitals, separate from Next.js so it can be tested with fake dependencies.
import { MAX_BODY_CHARS, parseVitalsBody, type VitalsEvent } from "./validate.ts";

export interface IngestDeps {
  /** The client's domain, or null if the client does not exist. */
  findClient(id: string): Promise<{ domain: string } | null>;
  /** One-minute rate limit bucket. False once the limit is exceeded. */
  rateOk(clientId: string, ipHash: string, limit: number): Promise<boolean>;
  insert(event: VitalsEvent): Promise<void>;
  /** Extra exact origins allowed (development, for example http://localhost:3000). */
  extraOrigins?: string[];
}

export const LIMIT_PER_IP_PER_MINUTE = 120;
export const LIMIT_PER_CLIENT_PER_MINUTE = 6000;

// The snippet runs on the client's own site, so the browser sends cross-origin requests from any domain.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, ngrok-skip-browser-warning",
  "Access-Control-Max-Age": "86400",
};

const reply = (status: number, body?: unknown, extra: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { ...CORS, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...extra },
  });

export const optionsResponse = () => new Response(null, { status: 204, headers: CORS });

/** The page's origin must be the client's domain or one of its subdomains (www included). */
export function originAllowed(origin: string, clientDomain: string, extra: string[] = []): boolean {
  if (extra.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
    const domain = clientDomain.toLowerCase().replace(/^www\./, "");
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

export async function handleIngest(request: Request, deps: IngestDeps, ipHash: string): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_CHARS * 4) return reply(413, { error: "body_too_large" });
  const text = await request.text();

  const parsed = parseVitalsBody(text);
  if (!parsed.ok) return reply(parsed.error === "body_too_large" ? 413 : 400, { error: parsed.error });
  const { event } = parsed;

  try {
    // Events for clients that do not exist are dropped without a trace (and without saying so).
    const client = await deps.findClient(event.client_id);
    if (!client) return reply(204);

    // Browsers always send Origin. Requests without it (curl, servers) are allowed: the rate limit covers them.
    const origin = request.headers.get("origin");
    if (origin && !originAllowed(origin, client.domain, deps.extraOrigins)) return reply(403, { error: "origin_not_allowed" });

    const within = (await deps.rateOk(event.client_id, ipHash, LIMIT_PER_IP_PER_MINUTE)) && (await deps.rateOk(event.client_id, "*", LIMIT_PER_CLIENT_PER_MINUTE));
    if (!within) return reply(429, { error: "rate_limited" }, { "Retry-After": "60" });

    await deps.insert(event);
    return reply(204);
  } catch {
    return reply(503, { error: "unavailable" });
  }
}
