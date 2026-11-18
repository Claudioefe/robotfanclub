// CrUX job: reads Google's field data for every target and stores one row per target and 28-day period.
// Idempotent: a period that is already stored is not touched. A target without data is reported, not an error.
import { isFatal, isTransient, type CruxSource, type CruxTarget } from "./source.ts";
import type { CruxPoint } from "./parser.ts";

export interface StoredTarget extends CruxTarget {
  clientId: string;
}

export interface CruxRow {
  client_id: string;
  scope: "origin" | "url";
  target: string;
  form_factor: "PHONE";
  period_start: string;
  period_end: string;
  inp_p75_ms: number;
  inp_good_share: number | null;
}

export interface CruxStore {
  /** Targets to query. Dry-run reads only sandbox clients; live reads real and demo clients, never sandbox. */
  targets(live: boolean): Promise<StoredTarget[]>;
  /** Inserts rows that do not exist yet. Returns how many were new. */
  insertRows(rows: CruxRow[]): Promise<number>;
}

export interface CruxRunOptions {
  /** "daily" reads the current 28-day window. "backfill" reads the weekly history (up to 40 periods). */
  mode: "daily" | "backfill";
  live: boolean;
  retryWaitMs?: number;
  /** Pause between targets, to stay far below Google's 150 queries per minute. */
  pauseMs?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

export interface CruxSummary {
  targets: number;
  withData: number;
  noData: number;
  failed: number;
  rowsWritten: number;
  stopped: string | null;
  errors: { client_id: string; target: string; message: string }[];
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

const toRow = (t: StoredTarget, p: CruxPoint): CruxRow => ({
  client_id: t.clientId,
  scope: t.scope,
  target: t.target,
  form_factor: "PHONE",
  period_start: p.periodStart,
  period_end: p.periodEnd,
  inp_p75_ms: p.inpP75Ms,
  inp_good_share: p.inpGoodShare,
});

export async function runCrux(store: CruxStore, source: CruxSource, options: CruxRunOptions): Promise<CruxSummary> {
  const wait = options.retryWaitMs ?? 5000;
  const pause = options.pauseMs ?? 450;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = options.log ?? (() => {});

  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (!isTransient(e)) throw e;
      await sleep(wait);
      return fn();
    }
  }

  const summary: CruxSummary = { targets: 0, withData: 0, noData: 0, failed: 0, rowsWritten: 0, stopped: null, errors: [] };

  for (const t of await store.targets(options.live)) {
    summary.targets++;
    try {
      const points = options.mode === "backfill" ? await withRetry(() => source.history(t)) : [await withRetry(() => source.current(t))].filter((p): p is CruxPoint => p !== null);
      if (!points.length) {
        summary.noData++; // not enough traffic for Google to publish this target
        log(`[${t.target}] no CrUX data`);
      } else {
        summary.withData++;
        summary.rowsWritten += await store.insertRows(points.map((p) => toRow(t, p)));
      }
    } catch (e) {
      summary.failed++;
      summary.errors.push({ client_id: t.clientId, target: t.target, message: message(e) });
      log(`[${t.target}] ${message(e)}`);
      if (isFatal(e)) {
        summary.stopped = `Stopped: ${message(e)}`;
        break;
      }
    }
    await sleep(pause);
  }
  return summary;
}
