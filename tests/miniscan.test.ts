import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { DfsError } from "../jobs/watcher/dataforseo.ts";
import { runMiniScans, type ClaimedScan, type MiniScanStore } from "../jobs/miniscan/run.ts";
import { SimulatedSource } from "../jobs/miniscan/simulated.ts";
import type { SerpSource, SerpTask } from "../jobs/watcher/dataforseo.ts";
import { verifyTurnstile } from "@/lib/miniscan/captcha";
import { MAX_SCAN_QUERIES, gapRows, outreachText, parseScanRequest, scanMode, summarize, topCompetitors, type ScanResult, type ScanRow } from "@/lib/miniscan/core";

const row = (query: string, over: Partial<ScanRow> = {}): ScanRow => ({ query, aiAnswer: true, cited: false, citedUrl: null, sources: 3, others: ["a.com"], ...over });

describe("scan requests", () => {
  const good = { domain: "https://www.Example.com/", queries: "best crm\nbest crm for startups" };

  it("accepts a valid request and normalizes the domain", () => {
    expect(parseScanRequest(good)).toEqual({ ok: true, value: { domain: "example.com", queries: ["best crm", "best crm for startups"] } });
  });

  it("holds at most 25 queries", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => `query ${i}`).join("\n");
    expect(parseScanRequest({ domain: "a.com", queries: many(MAX_SCAN_QUERIES) }).ok).toBe(true);
    const r = parseScanRequest({ domain: "a.com", queries: many(MAX_SCAN_QUERIES + 1) });
    expect(r).toMatchObject({ ok: false });
    expect(r.ok === false && r.error).toContain("25");
  });

  it("rejects bad domains, empty lists and a filled honeypot", () => {
    expect(parseScanRequest({ ...good, domain: "not a domain" }).ok).toBe(false);
    expect(parseScanRequest({ ...good, queries: "  " }).ok).toBe(false);
    expect(parseScanRequest({ ...good, website: "http://spam.example" }).ok).toBe(false);
    expect(parseScanRequest({ ...good, website: "  " }).ok).toBe(true); // blank honeypot is fine
  });

  it("is off unless the mode is explicitly simulated or live", () => {
    expect(scanMode(undefined)).toBe("off");
    expect(scanMode("")).toBe("off");
    expect(scanMode("yes")).toBe("off");
    expect(scanMode("true")).toBe("off");
    expect(scanMode("simulated")).toBe("simulated");
    expect(scanMode("live")).toBe("live");
  });
});

describe("results and outreach text", () => {
  const rows = [
    row("q1", { cited: true, citedUrl: "https://x.com/a" }),
    row("q2", { others: ["a.com", "b.com"] }),
    row("q3", { others: ["a.com"] }),
    row("q4", { aiAnswer: false, others: [] }),
    row("q5", { error: "boom", aiAnswer: false }),
  ];
  const result = summarize(rows);

  it("counts what was checked, what has an AI answer, what cites the domain, and what failed", () => {
    expect(result).toMatchObject({ checked: 4, withAi: 3, cited: 1, failed: 1 });
  });

  it("the gap is the AI answers that cite someone else (not the cited ones, not the missing answers, not the failures)", () => {
    expect(gapRows(result).map((r) => r.query)).toEqual(["q2", "q3"]);
  });

  it("ranks the competitors that fill the gap", () => {
    expect(topCompetitors(result)).toEqual([{ domain: "a.com", count: 2 }, { domain: "b.com", count: 1 }]);
  });

  it("writes the summary from facts only", () => {
    expect(outreachText("x.com", result)).toBe(
      ["Google answers 3 of 4 buying-intent queries with AI. x.com is cited in 1.", "Gap: 2 queries where the AI answer cites other sites.", "Cited instead most often: a.com (2), b.com (1)."].join("\n"),
    );
    const one: ScanResult = summarize([row("q")]);
    expect(outreachText("x.com", one)).toContain("Gap: 1 query where");
  });
});

describe("captcha (stubbed, never calls Cloudflare)", () => {
  const ok = (success: boolean) => async () => ({ ok: true, json: async () => ({ success }) });

  it("fails closed without a secret or a token", async () => {
    expect(await verifyTurnstile("token", undefined, "1.2.3.4", ok(true))).toBe(false);
    expect(await verifyTurnstile("", "secret", "1.2.3.4", ok(true))).toBe(false);
    expect(await verifyTurnstile(null, "secret", "1.2.3.4", ok(true))).toBe(false);
  });

  it("passes only when Cloudflare says success, and fails closed on any error", async () => {
    expect(await verifyTurnstile("token", "secret", "1.2.3.4", ok(true))).toBe(true);
    expect(await verifyTurnstile("token", "secret", "1.2.3.4", ok(false))).toBe(false);
    expect(await verifyTurnstile("token", "secret", undefined, async () => ({ ok: false, json: async () => ({ success: true }) }))).toBe(false);
    expect(await verifyTurnstile("token", "secret", undefined, async () => { throw new Error("network"); })).toBe(false);
  });

  it("sends the secret, the token and the visitor's IP", async () => {
    let sent: URLSearchParams | undefined;
    await verifyTurnstile("tok", "sec", "9.9.9.9", async (_url, init) => { sent = init.body; return { ok: true, json: async () => ({ success: true }) }; });
    expect(Object.fromEntries(sent!)).toEqual({ secret: "sec", response: "tok", remoteip: "9.9.9.9" });
  });
});

class MemoryStore implements MiniScanStore {
  queue: ClaimedScan[];
  claimedFor: boolean[] = [];
  done = new Map<string, { result: ScanResult; cost: number }>();
  failed = new Map<string, string>();
  constructor(queue: ClaimedScan[]) {
    this.queue = queue;
  }
  async claim(simulated: boolean, limit: number) { this.claimedFor.push(simulated); return this.queue.splice(0, limit); }
  async complete(id: string, result: ScanResult, cost: number) { this.done.set(id, { result, cost }); }
  async fail(id: string, error: string) { this.failed.set(id, error); }
  async failStale() { return 0; }
}
const fast = { retryWaitMs: 0, sleep: async () => {} };

describe("worker", () => {
  const scan: ClaimedScan = { id: "s1", domain: "example.com", queries: ["best crm", "crm pricing", "what is a crm", "crm for small business"] };

  it("completes a scan with plausible simulated results, in the order typed, and is deterministic", async () => {
    const a = new MemoryStore([{ ...scan }]);
    const s = await runMiniScans(a, (d) => new SimulatedSource(d), { simulated: true, ...fast, concurrency: 3 });
    expect(s).toMatchObject({ scans: 1, done: 1, failed: 0, costUsd: 0 });
    const { result } = a.done.get("s1")!;
    expect(result.rows.map((r) => r.query)).toEqual(scan.queries);
    expect(result.checked).toBe(4);
    const b = new MemoryStore([{ ...scan }]);
    await runMiniScans(b, (d) => new SimulatedSource(d), { simulated: true, ...fast });
    expect(b.done.get("s1")!.result).toEqual(result);
  });

  it("asks for the right kind of scan", async () => {
    const store = new MemoryStore([]);
    await runMiniScans(store, (d) => new SimulatedSource(d), { simulated: true, ...fast });
    await runMiniScans(store, (d) => new SimulatedSource(d), { simulated: false, ...fast });
    expect(store.claimedFor).toEqual([true, false]);
  });

  it("marks failed queries but still completes if some worked, and fails the scan if none did", async () => {
    class Flaky implements SerpSource {
      readonly name = "fixture";
      async organic(q: string): Promise<SerpTask> { if (q === "best crm") throw new Error("boom"); return new SimulatedSource("example.com").organic(q); }
      async aiMode(): Promise<SerpTask> { throw new Error("unused"); }
    }
    const some = new MemoryStore([{ ...scan }]);
    await runMiniScans(some, () => new Flaky(), { simulated: true, ...fast });
    const r = some.done.get("s1")!.result;
    expect(r.failed).toBe(1);
    expect(r.rows.find((x) => x.query === "best crm")!.error).toBeDefined();

    class Dead implements SerpSource {
      readonly name = "fixture";
      async organic(): Promise<SerpTask> { throw new Error("down"); }
      async aiMode(): Promise<SerpTask> { throw new Error("unused"); }
    }
    const none = new MemoryStore([{ ...scan }]);
    const s = await runMiniScans(none, () => new Dead(), { simulated: true, ...fast });
    expect(s.failed).toBe(1);
    expect(none.failed.get("s1")).toMatch(/None of the queries/);
  });

  it("stops everything on an authentication or funds error, and tells the visitor nothing technical", async () => {
    class Denied implements SerpSource {
      readonly name = "live";
      calls = 0;
      async organic(): Promise<SerpTask> { this.calls++; throw new DfsError("DataForSEO HTTP 401: login secret-detail", { httpStatus: 401 }); }
      async aiMode(): Promise<SerpTask> { throw new Error("unused"); }
    }
    const source = new Denied();
    const store = new MemoryStore([{ ...scan }, { id: "s2", domain: "other.com", queries: ["x"] }]);
    const s = await runMiniScans(store, () => source, { simulated: false, ...fast, concurrency: 1 });
    expect(s.stopped).toMatch(/401/);
    expect(s.scans).toBe(1); // the second scan was never started
    expect(store.failed.get("s1")).not.toContain("secret-detail");
    expect(source.calls).toBe(1);
  });
});

describe("the live worker is gated by its own switch", () => {
  const cli = (env: Record<string, string>) =>
    spawnSync("node", ["--no-warnings", "jobs/miniscan/cli.ts", "--mode", "live"], { cwd: process.cwd(), env: { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv, encoding: "utf8" });

  it("refuses without MINISCAN_ALLOW_LIVE=yes, even with credentials", () => {
    const r = cli({ DFS_LOGIN: "a", DFS_PASSWORD: "b", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "k" });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/MINISCAN_ALLOW_LIVE/);
  });

  it("only exactly yes enables it, and it still needs the credentials", () => {
    expect(cli({ MINISCAN_ALLOW_LIVE: "true", DFS_LOGIN: "a", DFS_PASSWORD: "b" }).status).toBe(2);
    const r = cli({ MINISCAN_ALLOW_LIVE: "yes" });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/DFS_LOGIN/);
  });
});
