// Sources of CrUX data. FixtureSource reads tests/fixtures (dry-run, no network). LiveSource calls Google's
// Chrome UX Report API with an API key (free: 150 queries per minute per project, per Google's docs).
import { readFileSync } from "node:fs";
import { parseHistory, parseRecord, type CruxPoint } from "./parser.ts";

export type Scope = "origin" | "url";
export interface CruxTarget {
  scope: Scope;
  target: string;
}

export interface CruxSource {
  readonly name: "fixture" | "live";
  /** The current 28-day window, or null when Google has no data for this target (not enough traffic). */
  current(t: CruxTarget): Promise<CruxPoint | null>;
  /** Up to 40 weekly periods, ascending. Empty when there is no data. */
  history(t: CruxTarget, periods?: number): Promise<CruxPoint[]>;
}

export class CruxError extends Error {
  httpStatus?: number;
  constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = "CruxError";
    this.httpStatus = httpStatus;
  }
}

/** Bad request, bad key, or the API is not enabled for the key: retrying or continuing would repeat the same failure. */
export const isFatal = (e: unknown) => e instanceof CruxError && [400, 401, 403].includes(e.httpStatus ?? 0);
/** Worth one retry: network errors, timeouts, 429 (quota) and 5xx. */
export const isTransient = (e: unknown) => !(e instanceof CruxError) || e.httpStatus === 429 || (e.httpStatus ?? 0) >= 500;

export class FixtureSource implements CruxSource {
  readonly name = "fixture";
  private record: unknown;
  private history_: unknown;
  constructor(dir: URL = new URL("../../tests/fixtures/", import.meta.url)) {
    this.record = JSON.parse(readFileSync(new URL("crux-record-sample.json", dir), "utf8"));
    this.history_ = JSON.parse(readFileSync(new URL("crux-history-sample.json", dir), "utf8"));
  }
  async current() {
    return parseRecord(this.record);
  }
  async history() {
    return parseHistory(this.history_);
  }
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class LiveSource implements CruxSource {
  readonly name = "live";
  private key: string;
  private fetcher: FetchLike;
  private root = "https://chromeuxreport.googleapis.com/v1/records";

  constructor(apiKey: string, fetcher: FetchLike = fetch as unknown as FetchLike) {
    if (!apiKey) throw new Error("LiveSource needs CRUX_API_KEY");
    this.key = apiKey;
    this.fetcher = fetcher;
  }

  private async post(method: "queryRecord" | "queryHistoryRecord", body: Record<string, unknown>): Promise<unknown | null> {
    // The key travels in the URL (Google's format). It is never put in error messages or logs.
    const res = await this.fetcher(`${this.root}:${method}?key=${encodeURIComponent(this.key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 404) return null; // no data for this target: normal for sites with little traffic
    if (!res.ok) throw new CruxError(`CrUX API HTTP ${res.status}`, res.status);
    return res.json();
  }

  // Fixed on purpose: phones only, INP only (the SLA is on mobile INP).
  private request(t: CruxTarget) {
    return { [t.scope]: t.target, formFactor: "PHONE", metrics: ["interaction_to_next_paint"] };
  }

  async current(t: CruxTarget) {
    const body = await this.post("queryRecord", this.request(t));
    return body === null ? null : parseRecord(body);
  }
  async history(t: CruxTarget, periods = 40) {
    const body = await this.post("queryHistoryRecord", { ...this.request(t), collectionPeriodCount: periods });
    return body === null ? [] : parseHistory(body);
  }
}
