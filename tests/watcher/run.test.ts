import { describe, expect, it } from "vitest";
import { DfsError, FixtureSource, LiveSource, type SerpSource, type SerpTask } from "../../jobs/watcher/dataforseo.ts";
import { resolveConfig } from "../../jobs/watcher/config.ts";
import { runWatcher, snapshotPath, type CheckRow, type RunSummary, type Store, type Target } from "../../jobs/watcher/run.ts";

const NOW = new Date("2026-11-17T14:00:00Z");
const CLIENT = "00000000-0000-4000-8000-0000000000aa";

class MemoryStore implements Store {
  checks: CheckRow[] = [];
  snapshots = new Map<string, string>();
  runs: { mode: string; summary?: RunSummary }[] = [];
  kinds: string[] = [];
  private target: Target;
  constructor(target: Target = { clientId: CLIENT, domain: "northwindsec.com", queries: ["q1", "q2"] }) {
    this.target = target;
  }
  async startRun(mode: string) { this.runs.push({ mode }); return this.runs.length; }
  async finishRun(id: number | null, summary: RunSummary) { this.runs[(id ?? 1) - 1].summary = summary; }
  async targets(kind: "real" | "sandbox") { this.kinds.push(kind); return [this.target]; }
  async existing(_c: string, day: string) { return new Set(this.checks.filter((c) => c.checked_on === day).map((c) => `${c.query}|${c.surface}`)); }
  async saveSnapshot(path: string, json: string) {
    if (this.snapshots.has(path)) throw new Error("The resource already exists");
    this.snapshots.set(path, json);
  }
  async insertCheck(row: CheckRow) {
    if (this.checks.some((c) => c.query === row.query && c.surface === row.surface && c.checked_on === row.checked_on)) return false;
    this.checks.push(row);
    return true;
  }
}

/** Wraps the fixture source, counting calls and failing on demand. */
class ScriptedSource implements SerpSource {
  readonly name = "fixture";
  calls = { organic: 0, aiMode: 0 };
  private inner = new FixtureSource();
  private failOrganic: (query: string, attempt: number) => boolean;
  private failAi: (query: string, attempt: number) => boolean;
  constructor(failOrganic: (query: string, attempt: number) => boolean = () => false, failAi: (query: string, attempt: number) => boolean = () => false) {
    this.failOrganic = failOrganic;
    this.failAi = failAi;
  }
  private attempts = new Map<string, number>();
  private bump(key: string) { const n = (this.attempts.get(key) ?? 0) + 1; this.attempts.set(key, n); return n; }
  async organic(q: string): Promise<SerpTask> {
    this.calls.organic++;
    if (this.failOrganic(q, this.bump(`o|${q}`))) throw new Error("DataForSEO HTTP 503");
    return this.inner.organic();
  }
  async aiMode(q: string): Promise<SerpTask> {
    this.calls.aiMode++;
    if (this.failAi(q, this.bump(`a|${q}`))) throw new Error("DataForSEO HTTP 503");
    return this.inner.aiMode();
  }
}

const opts = { mode: "dry_run" as const, now: NOW, retryWaitMs: 0, sleep: async () => {} };

describe("runWatcher", () => {
  it("writes one check per query and surface, with cost and evidence", async () => {
    const store = new MemoryStore();
    const s = await runWatcher(store, new ScriptedSource(), opts);

    expect(s).toMatchObject({ checksWritten: 4, queriesOk: 2, queriesFailed: 0, queriesSkipped: 0, errors: [] });
    expect(s.costUsd).toBeCloseTo(2 * (0.0026 + 0.004), 5);
    const ov = store.checks.find((c) => c.query === "q1" && c.surface === "ai_overview")!;
    expect(ov).toMatchObject({ client_id: CLIENT, checked_on: "2026-11-17", cited: true, cost_usd: 0.0026, organic_checked: true, organic_rank: null });
    const mode = store.checks.find((c) => c.query === "q1" && c.surface === "ai_mode")!;
    expect(mode).toMatchObject({ cost_usd: 0.004, organic_rank: 3 });
    // The raw JSON is stored at the documented path, before the row that points to it
    expect(ov.snapshot_path).toMatch(new RegExp(`^${CLIENT}/2026-11-17/ai_overview/q1-[0-9a-f]{8}-140000\\.json$`));
    expect(JSON.parse(store.snapshots.get(ov.snapshot_path)!).keyword).toBe("soc 2 type 1 vs type 2");
    expect(store.runs[0].summary?.checksWritten).toBe(4);
  });

  it("sends only columns that exist in aio_checks (a new parser field must not leak into the insert)", async () => {
    const store = new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: ["q1"] });
    await runWatcher(store, new ScriptedSource(), opts);
    // Keep in sync with supabase/migrations: if a column is added there, add it here on purpose.
    const columns = ["aio_present", "checked_at", "checked_on", "cited", "cited_url", "client_id", "cost_usd", "organic_checked", "organic_rank", "other_domains", "query", "snapshot_path", "source_count", "source_position", "surface"];
    for (const row of store.checks) expect(Object.keys(row).sort()).toEqual(columns);
  });

  it("is idempotent: a rerun the same day writes nothing and does not call the API", async () => {
    const store = new MemoryStore();
    await runWatcher(store, new ScriptedSource(), opts);
    const again = new ScriptedSource();
    const s = await runWatcher(store, again, opts);

    expect(s).toMatchObject({ checksWritten: 0, queriesSkipped: 2, queriesOk: 0, costUsd: 0 });
    expect(again.calls).toEqual({ organic: 0, aiMode: 0 });
    expect(store.checks).toHaveLength(4);
  });

  it("never erases an earlier citation with a later check", async () => {
    const store = new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: ["q1"] });
    await runWatcher(store, new ScriptedSource(), opts);
    expect(store.checks.every((c) => c.cited)).toBe(true);
    // A later rerun that would see "not cited" cannot replace the first check
    const original = store.snapshots.get(store.checks[0].snapshot_path);
    await expect(store.saveSnapshot(store.checks[0].snapshot_path, '{"changed":true}')).rejects.toThrow();
    expect(store.snapshots.get(store.checks[0].snapshot_path)).toBe(original);
    expect(await store.insertCheck({ ...store.checks[0], cited: false })).toBe(false);
  });

  it("retries a failed call once and then succeeds", async () => {
    const store = new MemoryStore();
    const source = new ScriptedSource((q, attempt) => q === "q1" && attempt === 1);
    const s = await runWatcher(store, source, opts);
    expect(s).toMatchObject({ queriesOk: 2, queriesFailed: 0, checksWritten: 4 });
    expect(source.calls.organic).toBe(3); // q1 twice, q2 once
  });

  it("records a failure after the retry and keeps going with the next query", async () => {
    const store = new MemoryStore();
    const s = await runWatcher(store, new ScriptedSource((q) => q === "q1", (q) => q === "q1"), opts);
    expect(s.queriesOk).toBe(1);
    expect(s.queriesFailed).toBe(1);
    expect(s.errors.map((e) => `${e.query}:${e.surface}`)).toEqual(["q1:ai_overview", "q1:ai_mode"]);
    expect(store.checks.filter((c) => c.query === "q2")).toHaveLength(2);
    expect(store.checks.filter((c) => c.query === "q1")).toHaveLength(0);
  });

  it("keeps the AI Mode check when the SERP fails, without guessing the organic rank", async () => {
    const store = new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: ["q1"] });
    const s = await runWatcher(store, new ScriptedSource(() => true), opts);
    expect(s).toMatchObject({ queriesFailed: 1, checksWritten: 1 });
    expect(store.checks).toHaveLength(1);
    expect(store.checks[0]).toMatchObject({ surface: "ai_mode", cited: true, organic_checked: false, organic_rank: null });
  });

  it("only fills in the surface that is missing", async () => {
    const store = new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: ["q1"] });
    const first = new ScriptedSource(() => false, () => true);
    await runWatcher(store, first, opts); // AI Mode fails twice, AI Overview is written
    expect(store.checks.map((c) => c.surface)).toEqual(["ai_overview"]);
    const s = await runWatcher(store, new ScriptedSource(), opts);
    expect(store.checks.map((c) => c.surface).sort()).toEqual(["ai_mode", "ai_overview"]);
    expect(s.checksWritten).toBe(1);
  });

  it("uses sandbox clients for dry-run and real clients for live", async () => {
    const a = new MemoryStore();
    await runWatcher(a, new ScriptedSource(), opts);
    expect(a.kinds).toEqual(["sandbox"]);
    const b = new MemoryStore();
    await runWatcher(b, new ScriptedSource(), { ...opts, mode: "live" });
    expect(b.kinds).toEqual(["real"]);
  });
});

describe("runWatcher: failures, cost and evidence integrity", () => {
  /** Fixture responses with a custom failure or shape. */
  class CustomSource implements SerpSource {
    readonly name = "fixture";
    calls = { organic: 0, aiMode: 0 };
    private inner = new FixtureSource();
    organicFn: () => Promise<SerpTask>;
    constructor(organicFn?: () => Promise<SerpTask>) {
      this.organicFn = organicFn ?? (() => this.inner.organic());
    }
    async organic() { this.calls.organic++; return this.organicFn(); }
    async aiMode() { this.calls.aiMode++; return this.inner.aiMode(); }
  }

  it("does not retry deterministic errors", async () => {
    const source = new CustomSource(async () => { throw new DfsError("DataForSEO 40501: invalid field", { apiCode: 40501 }); });
    const s = await runWatcher(new MemoryStore(), source, opts);
    expect(source.calls.organic).toBe(2); // once per query, no retry
    expect(s.queriesFailed).toBe(2);
  });

  it("retries transient API errors (HTTP 5xx) once", async () => {
    let n = 0;
    const inner = new FixtureSource();
    const source = new CustomSource(async () => { if (++n === 1) throw new DfsError("DataForSEO HTTP 503", { httpStatus: 503 }); return inner.organic(); });
    const s = await runWatcher(new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: ["q1"] }), source, opts);
    expect(source.calls.organic).toBe(2);
    expect(s.queriesOk).toBe(1);
  });

  it("stops the whole run on an authentication or funds error", async () => {
    const store = new MemoryStore();
    const source = new CustomSource(async () => { throw new DfsError("DataForSEO HTTP 401", { httpStatus: 401 }); });
    const s = await runWatcher(store, source, opts);
    expect(source.calls.organic).toBe(1); // q2 was never attempted
    expect(s.stopped).toMatch(/Stopped: DataForSEO HTTP 401/);
    expect(s.errors.at(-1)).toMatchObject({ query: "(run)" });
    expect(store.runs[0].summary).toBeDefined(); // the run is still closed in watcher_runs
  });

  it("stops when the cost ceiling is reached", async () => {
    const source = new ScriptedSource();
    const s = await runWatcher(new MemoryStore(), source, { ...opts, maxCostUsd: 0.005 });
    expect(s).toMatchObject({ queriesOk: 1 });
    expect(s.stopped).toMatch(/cost ceiling/);
    expect(source.calls.organic).toBe(1);
  });

  it("a problem with one client does not skip the run summary, and is recorded", async () => {
    class BrokenStore extends MemoryStore {
      async existing(): Promise<Set<string>> { throw new Error("db down"); }
    }
    const store = new BrokenStore();
    const s = await runWatcher(store, new ScriptedSource(), opts);
    expect(s.queriesFailed).toBe(1);
    expect(s.errors[0]).toMatchObject({ query: "(client)", message: "db down" });
    expect(store.runs[0].summary).toBeDefined();
  });

  it("closes the run even when listing clients fails", async () => {
    class NoTargets extends MemoryStore {
      async targets(): Promise<Target[]> { throw new Error("boom"); }
    }
    const store = new NoTargets();
    await expect(runWatcher(store, new ScriptedSource(), opts)).rejects.toThrow("boom");
    expect(store.runs[0].summary).toBeDefined();
  });

  it("keeps snapshot paths of different queries apart, even when their slugs collide", () => {
    const a = snapshotPath(CLIENT, "2026-11-17", "ai_mode", "Foo Bar", NOW);
    const b = snapshotPath(CLIENT, "2026-11-17", "ai_mode", "foo bar!", NOW);
    expect(a).not.toBe(b);
    expect(snapshotPath(CLIENT, "2026-11-17", "ai_mode", "日本語のクエリ", NOW)).toMatch(/\/q-[0-9a-f]{8}-140000\.json$/);
    const long = "x".repeat(200);
    expect(snapshotPath(CLIENT, "2026-11-17", "ai_mode", long + "a", NOW)).not.toBe(snapshotPath(CLIENT, "2026-11-17", "ai_mode", long + "b", NOW));
  });

  it("a retry after a partial failure gets its own snapshot path, never reusing the orphan file", async () => {
    const store = new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: ["q1"] });
    const first = await snapshotPath(CLIENT, "2026-11-17", "ai_overview", "q1", NOW);
    store.snapshots.set(first, '{"orphan":true}'); // snapshot saved by a run whose row insert failed
    await runWatcher(store, new ScriptedSource(), { ...opts, now: new Date("2026-11-17T14:20:00Z") });
    const row = store.checks.find((c) => c.surface === "ai_overview")!;
    expect(row.snapshot_path).not.toBe(first);
    expect(JSON.parse(store.snapshots.get(row.snapshot_path)!).keyword).toBe("soc 2 type 1 vs type 2");
  });

  it("treats a SERP without organic results as an unknown top 10, not an empty one", async () => {
    const inner = new FixtureSource();
    const source = new CustomSource(async () => {
      const t = await inner.organic();
      return { cost: t.cost, result: { ...t.result!, items: t.result!.items!.filter((i) => i.type !== "organic") } };
    });
    const store = new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: ["q1"] });
    await runWatcher(store, source, opts);
    expect(store.checks.find((c) => c.surface === "ai_overview")).toMatchObject({ cited: true, organic_checked: false, organic_rank: null });
  });

  it("a response without a result is a failed check, not 'no AI answer'", async () => {
    const empty = async () => ({ ok: true, status: 200, json: async () => ({ tasks: [{ status_code: 20000, cost: 0.002, result: [] }] }) });
    await expect(new LiveSource("a", "b", empty).organic("k")).rejects.toThrow(/no result/);
  });
});

describe("runWatcher: concurrency", () => {
  /** Counts how many calls are in flight at once. */
  class SlowSource implements SerpSource {
    readonly name = "fixture";
    inFlight = 0;
    peak = 0;
    calls = 0;
    private inner = new FixtureSource();
    private failFirstWith?: DfsError;
    constructor(failFirstWith?: DfsError) {
      this.failFirstWith = failFirstWith;
    }
    async organic(): Promise<SerpTask> {
      const n = ++this.calls; // this call's own number: other calls may start while it waits
      this.inFlight++;
      this.peak = Math.max(this.peak, this.inFlight);
      await new Promise((r) => setTimeout(r, 15));
      this.inFlight--;
      if (this.failFirstWith && n === 1) throw this.failFirstWith;
      return this.inner.organic();
    }
    async aiMode(): Promise<SerpTask> {
      return this.inner.aiMode();
    }
  }
  const eight = Array.from({ length: 8 }, (_, i) => `query ${i}`);

  it("checks several queries at once, never more than the limit, and writes everything", async () => {
    const store = new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: eight });
    const source = new SlowSource();
    const s = await runWatcher(store, source, { ...opts, concurrency: 3 });
    expect(source.peak).toBe(3);
    expect(s).toMatchObject({ queriesOk: 8, queriesFailed: 0, checksWritten: 16 });
    expect(new Set(store.checks.map((c) => c.snapshot_path)).size).toBe(16); // no two checks share a file
  });

  it("is sequential by default", async () => {
    const source = new SlowSource();
    await runWatcher(new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: eight.slice(0, 3) }), source, opts);
    expect(source.peak).toBe(1);
  });

  it("stops handing out new queries after a fatal error", async () => {
    const source = new SlowSource(new DfsError("DataForSEO HTTP 401", { httpStatus: 401 }));
    const s = await runWatcher(new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: eight }), source, { ...opts, concurrency: 2 });
    expect(s.stopped).toMatch(/401/);
    expect(source.calls).toBeLessThan(8); // the rest were never started
  });

  it("stops at the cost ceiling, overshooting by no more than the queries already in flight", async () => {
    const source = new SlowSource();
    const s = await runWatcher(new MemoryStore({ clientId: CLIENT, domain: "northwindsec.com", queries: eight }), source, { ...opts, concurrency: 2, maxCostUsd: 0.01 });
    expect(s.stopped).toMatch(/cost ceiling/);
    expect(s.queriesOk).toBeLessThanOrEqual(3);
  });
});

describe("live mode is gated", () => {
  const dry = resolveConfig([], {});
  it("defaults to dry-run", () => expect(dry).toEqual({ ok: true, mode: "dry_run" }));
  it("rejects unknown modes", () => expect(resolveConfig(["--mode", "yolo"], {}).ok).toBe(false));
  it("refuses live without the explicit allow flag, even with credentials", () => {
    const c = resolveConfig(["--mode", "live"], { DFS_LOGIN: "a", DFS_PASSWORD: "b" });
    expect(c).toMatchObject({ ok: false });
    expect((c as { error: string }).error).toMatch(/WATCHER_ALLOW_LIVE/);
  });
  it("refuses live without credentials", () => {
    expect(resolveConfig(["--mode", "live"], { WATCHER_ALLOW_LIVE: "yes" }).ok).toBe(false);
  });
  it("only a value of exactly yes enables it", () => {
    expect(resolveConfig(["--mode", "live"], { WATCHER_ALLOW_LIVE: "true", DFS_LOGIN: "a", DFS_PASSWORD: "b" }, NOW).ok).toBe(false);
    expect(resolveConfig(["--mode", "live"], { WATCHER_ALLOW_LIVE: "yes", DFS_LOGIN: "a", DFS_PASSWORD: "b" }, NOW)).toMatchObject({ ok: true, mode: "live" });
  });
  it("keeps the daily hour: live outside 14:00 to 16:59 UTC is refused unless explicitly allowed", () => {
    const env = { WATCHER_ALLOW_LIVE: "yes", DFS_LOGIN: "a", DFS_PASSWORD: "b" };
    const early = new Date("2026-11-17T09:00:00Z");
    expect(resolveConfig(["--mode", "live"], env, early).ok).toBe(false);
    expect(resolveConfig(["--mode", "live"], env, new Date("2026-11-17T17:00:00Z")).ok).toBe(false);
    expect(resolveConfig(["--mode", "live"], env, new Date("2026-11-17T16:59:00Z")).ok).toBe(true);
    expect(resolveConfig(["--mode", "live"], { ...env, WATCHER_ALLOW_OFF_HOUR: "yes" }, early).ok).toBe(true);
  });
  it("cannot build a live source without credentials", () => {
    expect(() => new LiveSource("", "")).toThrow(/DFS_LOGIN/);
  });
});

describe("LiveSource requests (stubbed fetch, no network)", () => {
  const ok = (cost: number) => async () => ({ ok: true, status: 200, json: async () => ({ tasks: [{ status_code: 20000, cost, result: [{ keyword: "k", items: [] }] }] }) });

  it("sends the fixed measurement conditions and the AI Overview option", async () => {
    const calls: { url: string; headers: Record<string, string>; body: unknown }[] = [];
    const fetcher = async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      return ok(0.002)();
    };
    const source = new LiveSource("login", "secret", fetcher);
    await source.organic("my query");
    await source.aiMode("my query");

    expect(calls[0].url).toBe("https://api.dataforseo.com/v3/serp/google/organic/live/advanced");
    expect(calls[0].body).toEqual([{ location_code: 2840, language_code: "en", device: "mobile", keyword: "my query", depth: 10, load_async_ai_overview: true, resolve_goto_urls: true }]);
    expect(calls[1].url).toBe("https://api.dataforseo.com/v3/serp/google/ai_mode/live/advanced");
    expect(calls[1].body).toEqual([{ location_code: 2840, language_code: "en", device: "mobile", keyword: "my query" }]);
    expect(calls[0].headers.Authorization).toBe("Basic " + Buffer.from("login:secret").toString("base64"));
  });

  it("returns the cost and fails on API errors", async () => {
    expect((await new LiveSource("a", "b", ok(0.0026)).organic("k")).cost).toBe(0.0026);
    const http = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await expect(new LiveSource("a", "b", http).organic("k")).rejects.toThrow("HTTP 503");
    const api = async () => ({ ok: true, status: 200, json: async () => ({ tasks: [{ status_code: 40201, status_message: "Insufficient funds" }] }) });
    await expect(new LiveSource("a", "b", api).organic("k")).rejects.toThrow("40201");
  });
});
