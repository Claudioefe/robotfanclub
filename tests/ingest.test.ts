import { describe, expect, it } from "vitest";
import ts from "typescript";
import { handleIngest, optionsResponse, originAllowed, type IngestDeps } from "@/lib/ingest/handle";
import { hashIp } from "@/lib/ingest/deps";
import { parseVitalsBody, type VitalsEvent } from "@/lib/ingest/validate";
import { buildSnippet } from "@/lib/snippet";

const CLIENT = "00000000-0000-4000-8000-0000000000bb";
const good = { client_id: CLIENT, metric: "INP", value: 180, rating: "good", device: "mobile", url_template: "/product/*", nav_type: "navigate", attribution: { interactionTarget: "button#buy", inputDelay: 12, junk: { a: 1 } } };

describe("parseVitalsBody", () => {
  it("accepts a valid event, as JSON or as text/plain (same string)", () => {
    const r = parseVitalsBody(JSON.stringify(good));
    expect(r).toMatchObject({ ok: true });
    expect((r as { event: VitalsEvent }).event).toEqual({
      client_id: CLIENT, metric: "INP", value: 180, rating: "good", device: "mobile", url_template: "/product/*",
      nav_type: "navigate", attribution: { interactionTarget: "button#buy", inputDelay: 12 }, // unknown and non-scalar keys dropped
    });
  });

  it.each([
    ["not json", "{oops", "invalid_json"],
    ["array body", "[]", "invalid_body"],
    ["bad client id", JSON.stringify({ ...good, client_id: "nope" }), "invalid_client_id"],
    ["unknown metric", JSON.stringify({ ...good, metric: "FID" }), "invalid_metric"],
    ["negative value", JSON.stringify({ ...good, value: -1 }), "invalid_value"],
    ["absurd INP", JSON.stringify({ ...good, value: 99_999 }), "invalid_value"],
    ["string value", JSON.stringify({ ...good, value: "180" }), "invalid_value"],
    ["bad device", JSON.stringify({ ...good, device: "tablet" }), "invalid_device"],
    ["relative url", JSON.stringify({ ...good, url_template: "product" }), "invalid_url_template"],
    ["full url", JSON.stringify({ ...good, url_template: "https://x.com/a" }), "invalid_url_template"],
    ["oversized", "x".repeat(9000), "body_too_large"],
  ])("rejects %s", (_name, body, error) => {
    expect(parseVitalsBody(body)).toEqual({ ok: false, error });
  });

  it("drops the query string and hash, rounds the value, and nulls unknown ratings", () => {
    const r = parseVitalsBody(JSON.stringify({ ...good, value: 180.6, rating: "meh", url_template: "/a/b?email=x@y.com#top", nav_type: "Bad Value!" }));
    expect((r as { event: VitalsEvent }).event).toMatchObject({ value: 181, rating: null, url_template: "/a/b", nav_type: null });
  });

  it("caps attribution strings", () => {
    const r = parseVitalsBody(JSON.stringify({ ...good, attribution: { interactionTarget: "x".repeat(500) } }));
    expect(((r as { event: VitalsEvent }).event.attribution as Record<string, string>).interactionTarget).toHaveLength(200);
  });
});

function fakeDeps(over: Partial<IngestDeps> = {}) {
  const inserted: VitalsEvent[] = [];
  const rate: [string, string, number][] = [];
  const deps: IngestDeps = {
    findClient: async (id) => (id === CLIENT ? { domain: "efedigital.com.ar" } : null),
    rateOk: async (c, ip, limit) => { rate.push([c, ip, limit]); return true; },
    insert: async (e) => { inserted.push(e); },
    extraOrigins: ["http://localhost:3000"],
    ...over,
  };
  return { deps, inserted, rate };
}
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://portal.test/api/ingest/vitals", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "text/plain", ...headers } });

describe("handleIngest", () => {
  it("stores a valid event and answers 204 with CORS", async () => {
    const { deps, inserted } = fakeDeps();
    const res = await handleIngest(post(good, { origin: "https://efedigital.com.ar" }), deps, "iphash");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ client_id: CLIENT, metric: "INP", value: 180 });
  });

  it("silently drops events for a client that does not exist", async () => {
    const { deps, inserted } = fakeDeps();
    const res = await handleIngest(post({ ...good, client_id: "00000000-0000-4000-8000-0000000000ff" }), deps, "ip");
    expect(res.status).toBe(204);
    expect(inserted).toHaveLength(0);
  });

  it("rejects invalid payloads with 400 and oversized ones with 413", async () => {
    const { deps, inserted } = fakeDeps();
    expect((await handleIngest(post({ ...good, metric: "X" }), deps, "ip")).status).toBe(400);
    expect((await handleIngest(post("x".repeat(9000)), deps, "ip")).status).toBe(413);
    expect(inserted).toHaveLength(0);
  });

  it("checks the page origin against the client's domain", async () => {
    const { deps, inserted } = fakeDeps();
    expect((await handleIngest(post(good, { origin: "https://www.efedigital.com.ar" }), deps, "ip")).status).toBe(204);
    expect((await handleIngest(post(good, { origin: "https://blog.efedigital.com.ar" }), deps, "ip")).status).toBe(204);
    expect((await handleIngest(post(good, { origin: "http://localhost:3000" }), deps, "ip")).status).toBe(204); // extra origin
    expect((await handleIngest(post(good, { origin: "https://evil.com" }), deps, "ip")).status).toBe(403);
    expect((await handleIngest(post(good, { origin: "https://efedigital.com.ar.evil.com" }), deps, "ip")).status).toBe(403);
    expect((await handleIngest(post(good), deps, "ip")).status).toBe(204); // no Origin: curl or server
    expect(inserted).toHaveLength(4); // the two foreign origins were rejected
  });

  it("applies the per-visitor and per-client rate limits, and answers 429 beyond them", async () => {
    const { deps, rate, inserted } = fakeDeps();
    await handleIngest(post(good), deps, "visitor");
    expect(rate).toEqual([[CLIENT, "visitor", 120], [CLIENT, "*", 6000]]);

    const blocked = fakeDeps({ rateOk: async () => false });
    const res = await handleIngest(post(good), blocked.deps, "visitor");
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(blocked.inserted).toHaveLength(0);
    expect(inserted).toHaveLength(1);
  });

  it("answers 503 when the database is unavailable, never 500 with details", async () => {
    const { deps } = fakeDeps({ insert: async () => { throw new Error("connection refused at 10.0.0.1"); } });
    const res = await handleIngest(post(good), deps, "ip");
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("10.0.0.1");
  });

  it("answers the CORS preflight", () => {
    const res = optionsResponse();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-allow-headers")).toContain("ngrok-skip-browser-warning");
  });

  it("originAllowed does not accept look-alikes", () => {
    expect(originAllowed("https://efedigital.com.ar", "efedigital.com.ar")).toBe(true);
    expect(originAllowed("https://notefedigital.com.ar", "efedigital.com.ar")).toBe(false);
    expect(originAllowed("not a url", "efedigital.com.ar")).toBe(false);
  });

  it("hashes IPs so raw addresses are never stored", () => {
    const h = hashIp("203.0.113.9", "secret");
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(h).not.toContain("203");
    expect(hashIp("203.0.113.9", "secret")).toBe(h);
    expect(hashIp("203.0.113.10", "secret")).not.toBe(h);
  });
});

// The snippet and the endpoint are developed apart: this runs the snippet's own code against the endpoint's parser.
describe("snippet contract", () => {
  const body = (opts: Parameters<typeof buildSnippet>[0]) => buildSnippet(opts).replace(/^<script type="module">\n/, "").replace(/\n<\/script>$/, "");

  function run(opts: Parameters<typeof buildSnippet>[0], { sessionStorage, userAgent = "Mozilla/5.0 (iPhone) Mobile" }: { sessionStorage?: Storage | null; userAgent?: string } = {}) {
    const beacons: { url: string; body: string }[] = [];
    const handlers: Record<string, (m: unknown) => void> = {};
    const stubs = {
      onINP: (f: (m: unknown) => void) => (handlers.INP = f),
      onLCP: (f: (m: unknown) => void) => (handlers.LCP = f),
      onCLS: (f: (m: unknown) => void) => (handlers.CLS = f),
    };
    // Replace the import line by the stubs, then run the rest exactly as the browser would.
    const code = body(opts).replace(/^import .*$/m, "const { onINP, onLCP, onCLS } = stubs;");
    class FakeNode {}
    const store = new Map<string, string>();
    const session = sessionStorage === undefined ? { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } : sessionStorage;
    new Function("stubs", "navigator", "location", "sessionStorage", "fetch", "Node", code)(
      stubs,
      { userAgent, sendBeacon: (url: string, b: string) => { beacons.push({ url, body: b }); return true; } },
      { pathname: "/product/12345/reviews" },
      session,
      () => {},
      FakeNode,
    );
    return { beacons, handlers, FakeNode };
  }

  it("is syntactically valid JavaScript", () => {
    const out = ts.transpileModule(body({ clientId: CLIENT, endpoint: "https://p.test/api/ingest/vitals" }), {
      reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    });
    expect(out.diagnostics).toEqual([]);
  });

  it("sends events that the endpoint accepts, with the template and CLS scaling", () => {
    const { beacons, handlers } = run({ clientId: CLIENT, endpoint: "https://p.test/api/ingest/vitals" });
    handlers.INP({ name: "INP", value: 214.4, rating: "needs-improvement", navigationType: "navigate", attribution: { interactionTarget: "#buy", inputDelay: 9, loadState: "complete" } });
    handlers.CLS({ name: "CLS", value: 0.0731, rating: "good", navigationType: "navigate", attribution: {} });

    expect(beacons).toHaveLength(2);
    expect(beacons[0].url).toBe("https://p.test/api/ingest/vitals");
    const inp = parseVitalsBody(beacons[0].body);
    expect(inp).toMatchObject({ ok: true });
    expect((inp as { event: VitalsEvent }).event).toMatchObject({
      client_id: CLIENT, metric: "INP", value: 214, rating: "needs-improvement", device: "mobile", url_template: "/product/*/reviews",
      attribution: { interactionTarget: "#buy", inputDelay: 9, loadState: "complete" },
    });
    const cls = parseVitalsBody(beacons[1].body);
    expect((cls as { event: VitalsEvent }).event).toMatchObject({ metric: "CLS", value: 73 }); // 0.0731 x 1000
  });

  it("reports desktop for desktop browsers", () => {
    const { beacons, handlers } = run({ clientId: CLIENT, endpoint: "https://p.test/x" }, { userAgent: "Mozilla/5.0 (Macintosh)" });
    handlers.LCP({ name: "LCP", value: 1800, rating: "good", navigationType: "navigate", attribution: {} });
    expect((parseVitalsBody(beacons[0].body) as { event: VitalsEvent }).event.device).toBe("desktop");
  });

  it("measures nothing when the session is not sampled, and remembers the decision", () => {
    const off = run({ clientId: CLIENT, endpoint: "https://p.test/x", sampleRate: 0 });
    expect(Object.keys(off.handlers)).toEqual([]); // no observers registered
    const on = run({ clientId: CLIENT, endpoint: "https://p.test/x", sampleRate: 1 });
    expect(Object.keys(on.handlers).sort()).toEqual(["CLS", "INP", "LCP"]);
  });

  it("still works when sessionStorage is blocked", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } as unknown as Storage;
    const { handlers } = run({ clientId: CLIENT, endpoint: "https://p.test/x", sampleRate: 1 }, { sessionStorage: blocked });
    expect(Object.keys(handlers)).toHaveLength(3);
  });
});
