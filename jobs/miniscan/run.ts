// Mini-Scan worker: takes queued scans and checks, for each query, whether Google answers with an AI Overview and
// whether it cites the scanned domain. Only the organic SERP call is used (it carries the AI Overview): about
// USD 0.002 per query, USD 0.05 for a full scan of 25. Simulated scans and real scans are never mixed.
import { summarize, type ScanResult, type ScanRow } from "../../src/lib/miniscan/core.ts";
import { isFatal, isTransient, type SerpSource } from "../watcher/dataforseo.ts";
import { parseCitation } from "../watcher/parser.ts";

export interface ClaimedScan {
  id: string;
  domain: string;
  queries: string[];
}

export interface MiniScanStore {
  /** Atomically takes up to `limit` pending scans of the given kind (they become "running"). */
  claim(simulated: boolean, limit: number): Promise<ClaimedScan[]>;
  complete(id: string, result: ScanResult, costUsd: number): Promise<void>;
  fail(id: string, error: string, costUsd: number): Promise<void>;
  /** Scans stuck in "running" for hours (a crashed job) are failed so they do not hang forever. */
  failStale(hours: number): Promise<number>;
}

export interface MiniScanOptions {
  simulated: boolean;
  concurrency?: number;
  maxScans?: number;
  retryWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (m: string) => void;
}

export interface MiniScanSummary {
  scans: number;
  done: number;
  failed: number;
  costUsd: number;
  stopped: string | null;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

export async function runMiniScans(store: MiniScanStore, makeSource: (domain: string) => SerpSource, options: MiniScanOptions): Promise<MiniScanSummary> {
  const wait = options.retryWaitMs ?? 5000;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = options.log ?? (() => {});
  const concurrency = Math.max(1, options.concurrency ?? 1);
  const summary: MiniScanSummary = { scans: 0, done: 0, failed: 0, costUsd: 0, stopped: null };

  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (!isTransient(e)) throw e;
      await sleep(wait);
      return fn();
    }
  }

  await store.failStale(3);

  for (const scan of await store.claim(options.simulated, options.maxScans ?? 3)) {
    summary.scans++;
    const source = makeSource(scan.domain);
    const rows: ScanRow[] = [];
    let cost = 0;
    let fatal: unknown = null;
    const queue = [...scan.queries];

    const worker = async () => {
      while (!fatal) {
        const query = queue.shift();
        if (query === undefined) return;
        try {
          const task = await withRetry(() => source.organic(query));
          cost += task.cost;
          // The top 10 is not needed here: the scan only asks "does the AI answer cite this domain?"
          const c = parseCitation(task.result, scan.domain, null);
          rows.push({ query, aiAnswer: c.aio_present, cited: c.cited, citedUrl: c.cited_url, sources: c.source_count ?? 0, others: c.other_domains });
        } catch (e) {
          if (isFatal(e)) fatal = e;
          rows.push({ query, aiAnswer: false, cited: false, citedUrl: null, sources: 0, others: [], error: message(e) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
    summary.costUsd += cost;

    // Keep the order the visitor typed
    rows.sort((a, b) => scan.queries.indexOf(a.query) - scan.queries.indexOf(b.query));
    const result = summarize(rows);
    if (fatal) {
      summary.failed++;
      summary.stopped = `Stopped: ${message(fatal)}`;
      await store.fail(scan.id, "The scan could not be completed. Please try again later.", cost);
      log(summary.stopped);
      break; // an authentication or funds problem: do not touch more scans
    }
    if (result.checked === 0) {
      summary.failed++;
      await store.fail(scan.id, "None of the queries could be checked. Please try again later.", cost);
    } else {
      summary.done++;
      await store.complete(scan.id, result, cost);
    }
  }
  return summary;
}
