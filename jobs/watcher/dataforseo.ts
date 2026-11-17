// Sources of SERP data. Two implementations behind one interface:
//   FixtureSource  reads tests/fixtures (dry-run). No network.
//   LiveSource     calls DataForSEO. It cannot be built without credentials, and the CLI refuses to build it
//                  unless live mode was explicitly enabled (see config.ts). Costs money: never used in tests.
import { readFileSync } from "node:fs";
import type { DfsResult } from "./parser.ts";

// Fixed measurement conditions (D-006). Changing them breaks the comparability of the series.
export const BASE = { location_code: 2840, language_code: "en", device: "mobile" } as const;

export interface SerpTask {
  cost: number;
  result: DfsResult | null;
}

export interface SerpSource {
  readonly name: "fixture" | "live";
  /** Organic SERP (top 10) with the AI Overview in the same call. */
  organic(keyword: string): Promise<SerpTask>;
  /** Google AI Mode. */
  aiMode(keyword: string): Promise<SerpTask>;
}

/** An error from DataForSEO, with the HTTP status or API code so the runner can tell transient from fatal. */
export class DfsError extends Error {
  httpStatus?: number;
  apiCode?: number;
  constructor(message: string, info: { httpStatus?: number; apiCode?: number } = {}) {
    super(message);
    this.name = "DfsError";
    this.httpStatus = info.httpStatus;
    this.apiCode = info.apiCode;
  }
}

/** Authentication or funds problems: retrying or continuing with other queries only wastes calls. Stop the run. */
export function isFatal(e: unknown): boolean {
  if (!(e instanceof DfsError)) return false;
  return [401, 402, 403].includes(e.httpStatus ?? 0) || (e.apiCode !== undefined && e.apiCode >= 40100 && e.apiCode <= 40299);
}

/** Worth one retry: network errors, timeouts, HTTP 429 and 5xx. Anything else is deterministic and would fail again. */
export function isTransient(e: unknown): boolean {
  if (!(e instanceof DfsError)) return true;
  return e.httpStatus === 429 || (e.httpStatus ?? 0) >= 500 || (e.apiCode ?? 0) >= 50000;
}

interface DfsEnvelope {
  tasks?: { status_code?: number; status_message?: string; cost?: number; result?: DfsResult[] | null }[];
}

function firstTask(body: DfsEnvelope): SerpTask {
  const t = body.tasks?.[0];
  if (!t || t.status_code !== 20000) throw new DfsError(`DataForSEO ${t?.status_code}: ${t?.status_message}`, { apiCode: t?.status_code });
  // A "successful" response without a result is not "no AI answer": it is a failed check, not evidence.
  const result = t.result?.[0];
  if (!result) throw new DfsError("DataForSEO returned no result", { apiCode: 50000 });
  return { cost: Number(t.cost ?? 0), result };
}

export class FixtureSource implements SerpSource {
  readonly name = "fixture";
  private organicBody: DfsEnvelope;
  private aiModeBody: DfsEnvelope;

  constructor(dir: URL = new URL("../../tests/fixtures/", import.meta.url)) {
    this.organicBody = JSON.parse(readFileSync(new URL("dfs-organic-sample.json", dir), "utf8"));
    this.aiModeBody = JSON.parse(readFileSync(new URL("dfs-ai-mode-sample.json", dir), "utf8"));
  }
  async organic(): Promise<SerpTask> {
    return firstTask(this.organicBody);
  }
  async aiMode(): Promise<SerpTask> {
    return firstTask(this.aiModeBody);
  }
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class LiveSource implements SerpSource {
  readonly name = "live";
  private auth: string;
  private fetcher: FetchLike;
  private root = "https://api.dataforseo.com/v3/serp/google";

  constructor(login: string, password: string, fetcher: FetchLike = fetch as unknown as FetchLike) {
    if (!login || !password) throw new Error("LiveSource needs DFS_LOGIN and DFS_PASSWORD");
    this.auth = "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
    this.fetcher = fetcher;
  }

  private async call(path: string, task: Record<string, unknown>): Promise<SerpTask> {
    const res = await this.fetcher(`${this.root}/${path}`, {
      method: "POST",
      headers: { Authorization: this.auth, "Content-Type": "application/json" },
      body: JSON.stringify([task]), // Live endpoints take one task per request
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new DfsError(`DataForSEO HTTP ${res.status}`, { httpStatus: res.status });
    return firstTask((await res.json()) as DfsEnvelope);
  }

  // load_async_ai_overview matters: many AI Overviews load asynchronously and would be missed without it.
  organic(keyword: string) {
    return this.call("organic/live/advanced", { ...BASE, keyword, depth: 10, load_async_ai_overview: true });
  }
  aiMode(keyword: string) {
    return this.call("ai_mode/live/advanced", { ...BASE, keyword });
  }
}
