// Sources of LLM Mentions data. FixtureSource reads the real responses saved in tests/fixtures/real (dry-run, no network).
// LiveSource calls DataForSEO and costs money: the CLI builds it only when live mode was explicitly enabled (see cli.ts).
import { readFileSync } from "node:fs";
import { DfsError, type FetchLike } from "../watcher/dataforseo.ts";
import type { DfsMentionsResult, Platform } from "./parser.ts";

// Same fixed conditions as the rest of the product (D-006).
export const BASE = { location_code: 2840, language_code: "en" } as const;
/** Rows requested per platform. Each row costs USD 0.001 on top of USD 0.10 per request. */
export const DEFAULT_LIMIT = 40;
export const REQUEST_COST_USD = 0.1;
export const ROW_COST_USD = 0.001;
export const estimateCostUsd = (limit: number) => REQUEST_COST_USD + ROW_COST_USD * limit;

export interface MentionsTask {
  cost: number;
  result: DfsMentionsResult;
}

export interface MentionsSource {
  readonly name: "fixture" | "live";
  mentions(domain: string, platform: Platform): Promise<MentionsTask>;
  /** The fixtures were captured for one domain; in dry-run that is the domain to look for, whatever the sandbox client is called. */
  matchDomain?(clientDomain: string): string;
}

interface Envelope {
  tasks?: { status_code?: number; status_message?: string; cost?: number; result?: DfsMentionsResult[] | null }[];
}

function firstTask(body: Envelope): MentionsTask {
  const t = body.tasks?.[0];
  if (!t || t.status_code !== 20000) throw new DfsError(`DataForSEO ${t?.status_code}: ${t?.status_message}`, { apiCode: t?.status_code });
  const result = t.result?.[0];
  if (!result) throw new DfsError("DataForSEO returned no result", { apiCode: 50000 });
  return { cost: Number(t.cost ?? 0), result };
}

export class FixtureSource implements MentionsSource {
  readonly name = "fixture";
  private bodies: Record<Platform, Envelope>;
  constructor(dir: URL = new URL("../../tests/fixtures/real/", import.meta.url)) {
    const load = (f: string) => JSON.parse(readFileSync(new URL(f, dir), "utf8")) as Envelope;
    this.bodies = { google: load("dfs-llm-mentions-bauman-google-40-real.json"), chat_gpt: load("dfs-llm-mentions-bauman-chatgpt-40-real.json") };
  }
  matchDomain() {
    return "baumanrarebooks.com";
  }
  async mentions(_domain: string, platform: Platform): Promise<MentionsTask> {
    return firstTask(this.bodies[platform]);
  }
}

export class LiveSource implements MentionsSource {
  readonly name = "live";
  private auth: string;
  private fetcher: FetchLike;
  private limit: number;

  constructor(login: string, password: string, options: { limit?: number; fetcher?: FetchLike } = {}) {
    if (!login || !password) throw new Error("LiveSource needs DFS_LOGIN and DFS_PASSWORD");
    this.auth = "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
    this.fetcher = options.fetcher ?? (fetch as unknown as FetchLike);
    this.limit = options.limit ?? DEFAULT_LIMIT;
  }

  async mentions(domain: string, platform: Platform): Promise<MentionsTask> {
    const task = { target: [{ domain, include_subdomains: true }], platform, ...BASE, order_by: ["ai_search_volume,desc"], limit: this.limit };
    const res = await this.fetcher("https://api.dataforseo.com/v3/ai_optimization/llm_mentions/search_mentions/live", {
      method: "POST",
      headers: { Authorization: this.auth, "Content-Type": "application/json" },
      body: JSON.stringify([task]),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new DfsError(`DataForSEO HTTP ${res.status}`, { httpStatus: res.status });
    return firstTask((await res.json()) as Envelope);
  }
}
