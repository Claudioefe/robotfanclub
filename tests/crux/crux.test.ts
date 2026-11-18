import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseHistory, parseRecord, type CruxPoint } from "../../jobs/crux/parser.ts";
import { runCrux, type CruxRow, type CruxStore, type StoredTarget } from "../../jobs/crux/run.ts";
import { CruxError, FixtureSource, LiveSource, type CruxSource, type CruxTarget } from "../../jobs/crux/source.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
const CLIENT = "00000000-0000-4000-8000-0000000000cc";

describe("parseRecord (queryRecord)", () => {
  it("reads the INP p75, its good share and the 28-day period", () => {
    expect(parseRecord(fixture("crux-record-sample.json"))).toEqual({ periodStart: "2026-10-21", periodEnd: "2026-11-17", inpP75Ms: 188, inpGoodShare: 0.7812 });
  });

  it("accepts a p75 sent as a string", () => {
    const body = fixture("crux-record-sample.json");
    body.record.metrics.interaction_to_next_paint.percentiles.p75 = "213";
    expect(parseRecord(body)?.inpP75Ms).toBe(213);
  });

  it("returns null when there is no INP, no period, or nothing at all", () => {
    const noInp = fixture("crux-record-sample.json");
    delete noInp.record.metrics.interaction_to_next_paint;
    expect(parseRecord(noInp)).toBeNull();
    const noPeriod = fixture("crux-record-sample.json");
    delete noPeriod.record.collectionPeriod;
    expect(parseRecord(noPeriod)).toBeNull();
    expect(parseRecord({})).toBeNull();
    expect(parseRecord(null)).toBeNull();
  });
});

describe("parseHistory (queryHistoryRecord)", () => {
  const points = parseHistory(fixture("crux-history-sample.json"));

  it("returns one point per weekly period, skipping the period without data", () => {
    expect(points.map((p) => p.periodEnd)).toEqual(["2026-10-17", "2026-10-24", "2026-11-07", "2026-11-14"]);
    expect(points.map((p) => p.inpP75Ms)).toEqual([296, 289, 214, 188]);
  });

  it("aligns each value with its own period and reads the good share by index", () => {
    expect(points[0]).toEqual({ periodStart: "2026-09-20", periodEnd: "2026-10-17", inpP75Ms: 296, inpGoodShare: 0.62 });
    expect(points[3].inpGoodShare).toBe(0.78); // the "NaN" at index 2 did not shift the rest
  });

  it("treats a NaN density as unknown", () => {
    const body = fixture("crux-history-sample.json");
    body.record.metrics.interaction_to_next_paint.percentilesTimeseries.p75s[2] = 200; // period with a p75 but NaN density
    expect(parseHistory(body)[2]).toMatchObject({ periodEnd: "2026-10-31", inpP75Ms: 200, inpGoodShare: null });
  });

  it("returns nothing for unusable bodies", () => {
    expect(parseHistory({})).toEqual([]);
    expect(parseHistory(null)).toEqual([]);
  });
});

class MemoryStore implements CruxStore {
  rows: CruxRow[] = [];
  asked: boolean[] = [];
  private list: StoredTarget[];
  constructor(list: StoredTarget[] = [{ clientId: CLIENT, scope: "origin", target: "https://www.example.com" }]) {
    this.list = list;
  }
  async targets(live: boolean) { this.asked.push(live); return this.list; }
  async insertRows(rows: CruxRow[]) {
    let added = 0;
    for (const r of rows) {
      if (this.rows.some((x) => x.client_id === r.client_id && x.target === r.target && x.period_end === r.period_end)) continue;
      this.rows.push(r);
      added++;
    }
    return added;
  }
}

const opts = { mode: "daily" as const, live: false, retryWaitMs: 0, pauseMs: 0, sleep: async () => {} };

describe("runCrux", () => {
  it("stores the current window and is idempotent", async () => {
    const store = new MemoryStore();
    const first = await runCrux(store, new FixtureSource(), opts);
    expect(first).toMatchObject({ targets: 1, withData: 1, noData: 0, failed: 0, rowsWritten: 1 });
    expect(store.rows[0]).toMatchObject({ client_id: CLIENT, scope: "origin", form_factor: "PHONE", period_end: "2026-11-17", inp_p75_ms: 188 });
    const second = await runCrux(store, new FixtureSource(), opts);
    expect(second.rowsWritten).toBe(0);
    expect(store.rows).toHaveLength(1);
  });

  it("backfills the weekly history", async () => {
    const store = new MemoryStore();
    const s = await runCrux(store, new FixtureSource(), { ...opts, mode: "backfill" });
    expect(s.rowsWritten).toBe(4);
    // Running the daily job afterwards adds the current window once
    await runCrux(store, new FixtureSource(), opts);
    expect(store.rows).toHaveLength(5);
  });

  it("treats a target without data as 'no data', not as a failure", async () => {
    const empty: CruxSource = { name: "fixture", current: async () => null, history: async () => [] };
    const s = await runCrux(new MemoryStore(), empty, opts);
    expect(s).toMatchObject({ withData: 0, noData: 1, failed: 0, rowsWritten: 0 });
  });

  it("retries a transient error once", async () => {
    let n = 0;
    const flaky: CruxSource = {
      name: "fixture",
      current: async () => { if (++n === 1) throw new CruxError("CrUX API HTTP 503", 503); return new FixtureSource().current(); },
      history: async () => [],
    };
    const s = await runCrux(new MemoryStore(), flaky, opts);
    expect(n).toBe(2);
    expect(s.withData).toBe(1);
  });

  it("does not retry deterministic errors, and keeps going with the next target", async () => {
    let calls = 0;
    const source: CruxSource = {
      name: "fixture",
      current: async (t: CruxTarget) => { calls++; if (t.target.includes("bad")) throw new CruxError("CrUX API HTTP 422", 422); return new FixtureSource().current(); },
      history: async () => [],
    };
    const store = new MemoryStore([
      { clientId: CLIENT, scope: "url", target: "https://bad.example.com/x" },
      { clientId: CLIENT, scope: "origin", target: "https://www.example.com" },
    ]);
    const s = await runCrux(store, source, opts);
    expect(calls).toBe(2); // no retry on the first
    expect(s).toMatchObject({ failed: 1, withData: 1 });
  });

  it("stops the run on a bad key or disabled API (HTTP 403) after one retry", async () => {
    let calls = 0;
    const denied: CruxSource = { name: "live", current: async () => { calls++; throw new CruxError("CrUX API HTTP 403", 403); }, history: async () => [] };
    const store = new MemoryStore([
      { clientId: CLIENT, scope: "origin", target: "https://a.example.com" },
      { clientId: CLIENT, scope: "origin", target: "https://b.example.com" },
    ]);
    const s = await runCrux(store, denied, { ...opts, live: true });
    expect(calls).toBe(2); // one retry for the first target, and the second target was never attempted
    expect(s.stopped).toMatch(/403/);
  });

  it("recovers from a one-off 403 (key restrictions still propagating)", async () => {
    let n = 0;
    const flaky: CruxSource = {
      name: "live",
      current: async () => { if (++n === 1) throw new CruxError("CrUX API HTTP 403", 403); return new FixtureSource().current(); },
      history: async () => [],
    };
    const s = await runCrux(new MemoryStore(), flaky, { ...opts, live: true });
    expect(s).toMatchObject({ withData: 1, failed: 0, stopped: null });
  });

  it("asks the store for live or sandbox targets according to the mode", async () => {
    const a = new MemoryStore();
    await runCrux(a, new FixtureSource(), opts);
    expect(a.asked).toEqual([false]);
    const b = new MemoryStore();
    await runCrux(b, new FixtureSource(), { ...opts, live: true });
    expect(b.asked).toEqual([true]);
  });
});

describe("LiveSource (stubbed fetch, no network)", () => {
  type Call = { url: string; body: Record<string, unknown> };
  const make = (status: number, json: unknown = {}) => {
    const calls: Call[] = [];
    const fetcher = async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: status >= 200 && status < 300, status, json: async () => json };
    };
    return { calls, source: new LiveSource("KEY 123&x", fetcher as never) };
  };
  const origin: CruxTarget = { scope: "origin", target: "https://www.example.com" };

  it("cannot be built without a key", () => {
    expect(() => new LiveSource("")).toThrow(/CRUX_API_KEY/);
  });

  it("asks for phone INP only, with the key in the query string (encoded)", async () => {
    const { calls, source } = make(200, fixture("crux-record-sample.json"));
    const point: CruxPoint | null = await source.current(origin);
    expect(point?.inpP75Ms).toBe(188);
    expect(calls[0].url).toBe("https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=KEY%20123%26x");
    expect(calls[0].body).toEqual({ origin: "https://www.example.com", formFactor: "PHONE", metrics: ["interaction_to_next_paint"] });
  });

  it("queries a URL with the url field, and the history with the period count", async () => {
    const { calls, source } = make(200, fixture("crux-history-sample.json"));
    expect(await source.history({ scope: "url", target: "https://www.example.com/blog/" }, 40)).toHaveLength(4);
    expect(calls[0].url).toContain(":queryHistoryRecord?key=");
    expect(calls[0].body).toEqual({ url: "https://www.example.com/blog/", formFactor: "PHONE", metrics: ["interaction_to_next_paint"], collectionPeriodCount: 40 });
  });

  it("maps HTTP 404 to 'no data' for both endpoints", async () => {
    const { source } = make(404, { error: { code: 404, status: "NOT_FOUND" } });
    expect(await source.current(origin)).toBeNull();
    expect(await source.history(origin)).toEqual([]);
  });

  it("raises errors without leaking the key", async () => {
    const { source } = make(403);
    const err = await source.current(origin).catch((e: unknown) => e as Error);
    expect(err).toBeInstanceOf(CruxError);
    expect((err as Error).message).toBe("CrUX API HTTP 403");
    expect((err as Error).message).not.toContain("KEY");
  });
});
