import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DfsError } from "../jobs/watcher/dataforseo.ts";
import { bareDomain, isClientHost, parseMentions, toIso, type MentionRow, type Platform } from "../jobs/ai-visibility/parser.ts";
import { runAiVisibility, snapshotPath, type AiVisibilityStore, type RunRow } from "../jobs/ai-visibility/run.ts";
import { FixtureSource, LiveSource, estimateCostUsd, type MentionsSource, type MentionsTask } from "../jobs/ai-visibility/source.ts";

const real = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/real/${name}`, import.meta.url), "utf8")).tasks[0].result[0];
const google = real("dfs-llm-mentions-bauman-google-40-real.json");
const chatgpt = real("dfs-llm-mentions-bauman-chatgpt-40-real.json");
const DOMAIN = "baumanrarebooks.com";

describe("domain matching", () => {
  it("matches the domain and its subdomains, never a lookalike", () => {
    expect(isClientHost("www.baumanrarebooks.com", DOMAIN)).toBe(true);
    expect(isClientHost("BaumanRareBooks.com", DOMAIN)).toBe(true);
    expect(isClientHost("shop.baumanrarebooks.com", DOMAIN)).toBe(true);
    expect(isClientHost("notbaumanrarebooks.com", DOMAIN)).toBe(false);
    expect(isClientHost("baumanrarebooks.com.evil.test", DOMAIN)).toBe(false);
    expect(isClientHost(null, DOMAIN)).toBe(false);
    expect(bareDomain(" WWW.Example.com ")).toBe("example.com");
  });

  it("reads DataForSEO timestamps", () => {
    expect(toIso("2025-12-03 15:09:47 +00:00")).toBe("2025-12-03T15:09:47.000Z");
    expect(toIso(null)).toBeNull();
    expect(toIso("garbage")).toBeNull();
  });
});

describe("parsing real LLM Mentions responses", () => {
  const g = parseMentions(google, DOMAIN);
  const c = parseMentions(chatgpt, DOMAIN);

  it("keeps the total of the whole database apart from the rows it returned", () => {
    expect(g.totalCount).toBe(1543);
    expect(g.rows).toHaveLength(40);
    expect(c.totalCount).toBe(122);
    expect(c.rows).toHaveLength(40);
  });

  it("Google: every row cites the client, with its position among the sources", () => {
    expect(g.rows.every((r) => r.relation === "cited")).toBe(true);
    expect(g.rows[0]).toMatchObject({ question: "gifts for a book lover", ai_search_volume: 27100, source_count: 6, client_source_rank: 6, relation: "cited" });
    expect(g.rows[0].client_url).toContain("baumanrarebooks.com/blog/rare-books-as-gifts");
    expect(g.rows[0].other_domains).toContain("magpiebyjenshoop.com");
    expect(g.rows[0].other_domains.some((d) => d.includes("baumanrarebooks"))).toBe(false);
  });

  it("ChatGPT: separates 'cited' from 'consulted' (the AI read a page of the client but did not cite it)", () => {
    const cited = c.rows.filter((r) => r.relation === "cited");
    const consulted = c.rows.filter((r) => r.relation === "consulted");
    expect(cited.length).toBe(17);
    expect(consulted.length).toBe(23);
    for (const r of consulted) expect(r.client_source_rank).toBeNull();
    for (const r of cited) expect(r.client_source_rank).toBeGreaterThanOrEqual(1);
  });

  it("does not claim a mention it cannot show: a row with neither source nor consulted page is skipped", () => {
    const p = parseMentions({ total_count: 5, items: [{ question: "q", sources: [{ domain: "other.com" }], search_results: [] }, { question: "  " }] }, DOMAIN);
    expect(p.rows).toEqual([]);
    expect(p.skipped).toBe(2);
    expect(p.totalCount).toBe(5);
  });

  it("copes with null lists and missing numbers", () => {
    const p = parseMentions({ items: [{ question: "q", sources: [{ domain: DOMAIN, url: "https://baumanrarebooks.com/x" }], ai_search_volume: null, last_response_at: null }] }, DOMAIN);
    expect(p.rows[0]).toMatchObject({ ai_search_volume: null, last_response_at: null, client_source_rank: 1, relation: "cited" });
    expect(parseMentions({ items: null }, DOMAIN)).toEqual({ totalCount: 0, rows: [], skipped: 0 });
  });
});

class MemoryStore implements AiVisibilityStore {
  runs = new Map<string, { run: RunRow; rows: MentionRow[] }>();
  snapshots: string[] = [];
  liveAsked: boolean[] = [];
  list: { clientId: string; domain: string }[];
  constructor(list: { clientId: string; domain: string }[]) {
    this.list = list;
  }
  async targets(live: boolean) { this.liveAsked.push(live); return this.list; }
  async hasRun(c: string, p: Platform, d: string) { return this.runs.has(`${c}|${p}|${d}`); }
  async saveSnapshot(path: string) { this.snapshots.push(path); }
  async insertRun(run: RunRow, rows: MentionRow[]) { this.runs.set(`${run.client_id}|${run.platform}|${run.captured_on}`, { run, rows }); }
}
const fast = { retryWaitMs: 0, sleep: async () => {}, limit: 40, maxCostUsd: 5 };
const NOW = new Date("2026-11-18T16:30:00Z");

describe("job", () => {
  it("dry-run reads the saved real responses: both platforms, snapshot first, nothing spent", async () => {
    const store = new MemoryStore([{ clientId: "c1", domain: "sandbox.example" }]);
    const s = await runAiVisibility(store, new FixtureSource(), { live: false, now: NOW, ...fast });
    expect(s).toMatchObject({ targets: 1, calls: 2, failed: 0, rows: 80, stopped: null });
    expect(store.snapshots).toHaveLength(2);
    expect(store.snapshots[0]).toMatch(/^c1\/ai-visibility\/2026-11-18\/google-[0-9a-f]{6}-163000\.json$/);
    const stored = store.runs.get("c1|chat_gpt|2026-11-18")!;
    expect(stored.run).toMatchObject({ total_count: 122, rows_stored: 40, cost_usd: 0.14 });
    expect(store.liveAsked).toEqual([false]);
  });

  it("is idempotent: a platform already stored today is not asked again", async () => {
    const store = new MemoryStore([{ clientId: "c1", domain: "x.test" }]);
    await runAiVisibility(store, new FixtureSource(), { live: false, now: NOW, ...fast });
    const again = await runAiVisibility(store, new FixtureSource(), { live: false, now: NOW, ...fast });
    expect(again).toMatchObject({ calls: 0, skipped: 2 });
  });

  it("stops before a call that would pass the cost ceiling", async () => {
    let calls = 0;
    const source: MentionsSource = { name: "live", async mentions(): Promise<MentionsTask> { calls++; return { cost: 0.14, result: google }; } };
    const store = new MemoryStore([{ clientId: "a", domain: DOMAIN }, { clientId: "b", domain: DOMAIN }]);
    const s = await runAiVisibility(store, source, { live: true, now: NOW, ...fast, maxCostUsd: 0.3 });
    expect(calls).toBe(2); // 0.14 + 0.14 = 0.28; the third call (estimated 0.14) would pass 0.3
    expect(s.stopped).toMatch(/Stopped before spending more than USD 0.30/);
  });

  it("stops everything on an authentication or funds error", async () => {
    let calls = 0;
    const source: MentionsSource = { name: "live", async mentions() { calls++; throw new DfsError("DataForSEO HTTP 402", { httpStatus: 402 }); } };
    const store = new MemoryStore([{ clientId: "a", domain: DOMAIN }, { clientId: "b", domain: DOMAIN }]);
    const s = await runAiVisibility(store, source, { live: true, now: NOW, ...fast });
    expect(calls).toBe(1);
    expect(s).toMatchObject({ failed: 1 });
    expect(s.stopped).toMatch(/402/);
  });

  it("retries a transient error once, and a deterministic one never", async () => {
    let n = 0;
    const flaky: MentionsSource = { name: "live", async mentions() { n++; if (n === 1) throw new DfsError("HTTP 503", { httpStatus: 503 }); return { cost: 0.14, result: google }; } };
    const ok = await runAiVisibility(new MemoryStore([{ clientId: "a", domain: DOMAIN }]), flaky, { live: true, now: NOW, ...fast });
    expect(ok.failed).toBe(0);
    expect(n).toBe(3); // 1 failed + 1 retry for google, 1 for chat_gpt

    let m = 0;
    const bad: MentionsSource = { name: "live", async mentions() { m++; throw new DfsError("DataForSEO 40501: bad field", { apiCode: 40501 }); } };
    await runAiVisibility(new MemoryStore([{ clientId: "a", domain: DOMAIN }]), bad, { live: true, now: NOW, ...fast });
    expect(m).toBe(2); // one attempt per platform, no retry
  });

  it("keeps a failure of one platform from hiding the other", async () => {
    const source: MentionsSource = { name: "live", async mentions(_d, p) { if (p === "google") throw new DfsError("x", { apiCode: 40501 }); return { cost: 0.14, result: chatgpt }; } };
    const store = new MemoryStore([{ clientId: "a", domain: DOMAIN }]);
    const s = await runAiVisibility(store, source, { live: true, now: NOW, ...fast });
    expect(s).toMatchObject({ calls: 1, failed: 1 });
    expect(store.runs.has("a|chat_gpt|2026-11-18")).toBe(true);
  });

  it("snapshot paths are unique per client, platform and run time", () => {
    const a = snapshotPath("c", "2026-11-18", "google", NOW);
    expect(a).not.toBe(snapshotPath("c", "2026-11-18", "chat_gpt", NOW));
    expect(a).not.toBe(snapshotPath("c", "2026-11-18", "google", new Date("2026-11-18T16:31:00Z")));
  });
});

describe("live source (stubbed, never calls DataForSEO)", () => {
  it("sends the fixed conditions, the platform and the row limit, and estimates cost", async () => {
    let sent: { url: string; body: unknown; auth: string } | undefined;
    const fetcher = async (url: string, init: { body: string; headers: Record<string, string> }) => {
      sent = { url, body: JSON.parse(init.body), auth: init.headers.Authorization };
      return { ok: true, status: 200, json: async () => ({ tasks: [{ status_code: 20000, cost: 0.14, result: [google] }] }) };
    };
    const task = await new LiveSource("login", "pw", { limit: 40, fetcher }).mentions(DOMAIN, "chat_gpt");
    expect(task.cost).toBe(0.14);
    expect(sent!.url).toBe("https://api.dataforseo.com/v3/ai_optimization/llm_mentions/search_mentions/live");
    expect(sent!.body).toEqual([{ target: [{ domain: DOMAIN, include_subdomains: true }], platform: "chat_gpt", location_code: 2840, language_code: "en", order_by: ["ai_search_volume,desc"], limit: 40 }]);
    expect(sent!.auth).toBe("Basic " + Buffer.from("login:pw").toString("base64"));
    expect(estimateCostUsd(40)).toBeCloseTo(0.14, 5);
  });

  it("turns HTTP and API errors into DfsError, and an empty result into a failure (not into 'no mentions')", async () => {
    const http = new LiveSource("a", "b", { fetcher: async () => ({ ok: false, status: 401, json: async () => ({}) }) });
    await expect(http.mentions(DOMAIN, "google")).rejects.toMatchObject({ httpStatus: 401 });
    const api = new LiveSource("a", "b", { fetcher: async () => ({ ok: true, status: 200, json: async () => ({ tasks: [{ status_code: 40501, status_message: "bad" }] }) }) });
    await expect(api.mentions(DOMAIN, "google")).rejects.toMatchObject({ apiCode: 40501 });
    const empty = new LiveSource("a", "b", { fetcher: async () => ({ ok: true, status: 200, json: async () => ({ tasks: [{ status_code: 20000, result: [] }] }) }) });
    await expect(empty.mentions(DOMAIN, "google")).rejects.toBeInstanceOf(DfsError);
    expect(() => new LiveSource("", "")).toThrow(/DFS_LOGIN/);
  });
});

describe("the live job is gated by its own switch", () => {
  const cli = (env: Record<string, string>) =>
    spawnSync("node", ["--no-warnings", "jobs/ai-visibility/cli.ts", "--mode", "live"], { cwd: process.cwd(), env: { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv, encoding: "utf8" });

  it("refuses without AI_VISIBILITY_ALLOW_LIVE=yes, even with credentials", () => {
    const r = cli({ DFS_LOGIN: "a", DFS_PASSWORD: "b", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "k" });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/AI_VISIBILITY_ALLOW_LIVE/);
  });

  it("only exactly yes enables it, and it still needs the credentials", () => {
    expect(cli({ AI_VISIBILITY_ALLOW_LIVE: "true", DFS_LOGIN: "a", DFS_PASSWORD: "b" }).status).toBe(2);
    const r = cli({ AI_VISIBILITY_ALLOW_LIVE: "yes" });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/DFS_LOGIN/);
  });
});
