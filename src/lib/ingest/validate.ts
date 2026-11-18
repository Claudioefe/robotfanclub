// Validation of events sent by the real-visitor speed snippet (POST /api/ingest/vitals).
// The endpoint is public, so everything is checked and bounded: unknown fields are dropped, sizes are capped.

export const METRICS = ["INP", "LCP", "CLS"] as const;
export type Metric = (typeof METRICS)[number];

export const MAX_BODY_CHARS = 8192;
const MAX_VALUE: Record<Metric, number> = { INP: 60_000, LCP: 120_000, CLS: 100_000 }; // ms; CLS x1000
const RATINGS = ["good", "needs-improvement", "poor"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Attribution keys kept from web-vitals (scalars only). Everything else is dropped.
const ATTRIBUTION_KEYS = new Set([
  "interactionTarget", "interactionType", "interactionTime", "inputDelay", "processingDuration", "presentationDelay",
  "loadState", "nextPaintTime",
  "target", "url", "timeToFirstByte", "resourceLoadDelay", "resourceLoadDuration", "elementRenderDelay",
  "largestShiftTarget", "largestShiftValue", "largestShiftTime",
]);

export interface VitalsEvent {
  client_id: string;
  metric: Metric;
  value: number;
  rating: string | null;
  device: "mobile" | "desktop";
  url_template: string;
  nav_type: string | null;
  attribution: Record<string, string | number | boolean> | null;
}

export type ParseResult = { ok: true; event: VitalsEvent } | { ok: false; error: string };

const bad = (error: string): ParseResult => ({ ok: false, error });

function cleanAttribution(raw: unknown): VitalsEvent["attribution"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ATTRIBUTION_KEYS.has(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** Accepts the body as text (sendBeacon sends text/plain) or JSON: both are the same JSON string. */
export function parseVitalsBody(text: string): ParseResult {
  if (text.length > MAX_BODY_CHARS) return bad("body_too_large");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return bad("invalid_json");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("invalid_body");
  const b = raw as Record<string, unknown>;

  if (typeof b.client_id !== "string" || !UUID.test(b.client_id)) return bad("invalid_client_id");
  if (!METRICS.includes(b.metric as Metric)) return bad("invalid_metric");
  const metric = b.metric as Metric;

  const value = b.value;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > MAX_VALUE[metric]) return bad("invalid_value");

  if (b.device !== "mobile" && b.device !== "desktop") return bad("invalid_device");

  // URL template: a path such as /product/*. Query and hash are dropped so no personal data is kept.
  if (typeof b.url_template !== "string") return bad("invalid_url_template");
  const path = b.url_template.split(/[?#]/)[0];
  if (!path.startsWith("/") || path.length > 200) return bad("invalid_url_template");

  const rating = typeof b.rating === "string" && RATINGS.includes(b.rating) ? b.rating : null;
  const navType = typeof b.nav_type === "string" && /^[a-z-]{1,32}$/.test(b.nav_type) ? b.nav_type : null;

  return {
    ok: true,
    event: {
      client_id: b.client_id.toLowerCase(),
      metric,
      value: Math.round(value),
      rating,
      device: b.device,
      url_template: path,
      nav_type: navType,
      attribution: cleanAttribution(b.attribution),
    },
  };
}
