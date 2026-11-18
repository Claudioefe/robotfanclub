// Watcher orchestrator: for every query of every active window it checks Google's AI answers and stores
// one check per query, surface and UTC day, plus the raw JSON as evidence.
//
// Evidence rules (D-018, D-027): checks are append-only and idempotent. A rerun the same day skips what already
// exists (it does not even call the API again). Every snapshot has its own unique path, so a file is never reused
// for a different response, and a snapshot is never silently replaced.
import { createHash } from "node:crypto";
import type { Mode } from "./config.ts";
import { isFatal, isTransient, type SerpSource, type SerpTask } from "./dataforseo.ts";
import { organicTop10, parseCitation, slug, type ParsedCitation } from "./parser.ts";

export type Surface = "ai_overview" | "ai_mode";

export interface Target {
  clientId: string;
  domain: string;
  queries: string[];
}

/**
 * One row of aio_checks. Only columns that exist in the database: ParsedCitation also carries values (such as
 * unresolved_refs) that stay in the raw JSON snapshot and must not be sent to the table.
 */
export interface CheckRow extends Omit<ParsedCitation, "unresolved_refs"> {
  client_id: string;
  query: string;
  surface: Surface;
  checked_on: string;
  checked_at: string;
  snapshot_path: string;
  cost_usd: number;
}

export interface RunError {
  client_id: string;
  query: string;
  surface?: Surface;
  message: string;
}

export interface RunSummary {
  checksWritten: number;
  queriesOk: number;
  queriesFailed: number;
  queriesSkipped: number;
  costUsd: number;
  stopped: string | null; // set when the run stopped early (fatal API error or cost ceiling)
  errors: RunError[];
}

export interface Store {
  startRun(mode: Mode): Promise<number | null>;
  finishRun(id: number | null, summary: RunSummary): Promise<void>;
  /** Clients of this kind that have an active window today, with that window's queries. */
  targets(kind: "real" | "sandbox", today: string): Promise<Target[]>;
  /** Keys "query|surface" already checked on this day. */
  existing(clientId: string, day: string): Promise<Set<string>>;
  /** Saves the raw JSON. Must fail if the path already exists. */
  saveSnapshot(path: string, json: string): Promise<void>;
  /** Inserts a check; false if one already existed for that query, surface and day. */
  insertCheck(row: CheckRow): Promise<boolean>;
}

export interface RunOptions {
  mode: Mode;
  now?: Date;
  retryWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
  /** Stop the run once this much has been spent (API cost reported by DataForSEO). */
  maxCostUsd?: number;
}

const SURFACES: Surface[] = ["ai_overview", "ai_mode"];
const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

/**
 * Snapshot path: {client}/{day}/{surface}/{slug}-{hash of the exact query}-{time of the run}.json
 * The hash keeps different queries apart even when their slugs collide (case, punctuation, non-ASCII, truncation);
 * the time keeps a retry after a partial failure from colliding with the orphan file of the first attempt.
 */
export function snapshotPath(clientId: string, day: string, surface: Surface, query: string, now: Date): string {
  const hash = createHash("sha1").update(query).digest("hex").slice(0, 8);
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `${clientId}/${day}/${surface}/${slug(query) || "q"}-${hash}-${time}.json`;
}

export async function runWatcher(store: Store, source: SerpSource, options: RunOptions): Promise<RunSummary> {
  const now = options.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  const wait = options.retryWaitMs ?? 5000;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = options.log ?? (() => {});

  // One retry, only for transient errors (network, timeouts, 429, 5xx). Deterministic errors would just cost again.
  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (!isTransient(e)) throw e;
      await sleep(wait);
      return fn();
    }
  }

  const summary: RunSummary = { checksWritten: 0, queriesOk: 0, queriesFailed: 0, queriesSkipped: 0, costUsd: 0, stopped: null, errors: [] };
  const runId = await store.startRun(options.mode);
  const kind = options.mode === "live" ? "real" : "sandbox";

  try {
    clients: for (const target of await store.targets(kind, today)) {
      try {
        const done = await store.existing(target.clientId, today);

        for (const query of target.queries) {
          const need = SURFACES.filter((s) => !done.has(`${query}|${s}`));
          if (!need.length) {
            summary.queriesSkipped++;
            continue;
          }

          const failures: RunError[] = [];
          let fatal: unknown = null;
          const fail = (surface: Surface | undefined, e: unknown) => {
            failures.push({ client_id: target.clientId, query, surface, message: message(e) });
            if (isFatal(e)) fatal = e;
          };

          // The organic SERP is always needed: it carries the AI Overview and the top 10 used for off-top10.
          let serp: SerpTask | null = null;
          let ai: SerpTask | null = null;
          try {
            serp = await withRetry(() => source.organic(query));
            summary.costUsd += serp.cost;
          } catch (e) {
            fail("ai_overview", e);
          }
          if (!fatal && need.includes("ai_mode")) {
            try {
              ai = await withRetry(() => source.aiMode(query));
              summary.costUsd += ai.cost;
            } catch (e) {
              fail("ai_mode", e);
            }
          }

          // null = the top 10 is unknown (SERP failed or came back empty): organic_checked becomes false instead of guessing.
          const top10 = organicTop10(serp?.result);

          for (const surface of need) {
            const task = surface === "ai_overview" ? serp : ai;
            if (!task) continue; // its failure is already recorded
            try {
              const parsed = parseCitation(task.result, target.domain, top10);
              const path = snapshotPath(target.clientId, today, surface, query, now);
              await store.saveSnapshot(path, JSON.stringify(task.result)); // evidence first, then the row that points to it
              const inserted = await store.insertCheck({
                aio_present: parsed.aio_present,
                cited: parsed.cited,
                cited_url: parsed.cited_url,
                source_position: parsed.source_position,
                source_count: parsed.source_count,
                organic_rank: parsed.organic_rank,
                organic_checked: parsed.organic_checked,
                other_domains: parsed.other_domains,
                client_id: target.clientId,
                query,
                surface,
                checked_on: today,
                checked_at: now.toISOString(),
                snapshot_path: path,
                cost_usd: round5(task.cost),
              });
              if (inserted) summary.checksWritten++;
            } catch (e) {
              fail(surface, e);
            }
          }

          if (failures.length) {
            summary.queriesFailed++;
            summary.errors.push(...failures);
            log(`[${target.domain}] "${query}": ${failures.map((f) => f.message).join("; ")}`);
          } else {
            summary.queriesOk++;
          }

          if (fatal) {
            summary.stopped = `Stopped: ${message(fatal)}`;
            break clients;
          }
          if (options.maxCostUsd !== undefined && summary.costUsd >= options.maxCostUsd) {
            summary.stopped = `Stopped: cost ceiling of $${options.maxCostUsd} reached`;
            break clients;
          }
        }
      } catch (e) {
        // A problem with one client (for example, reading its checks) must not skip the others.
        summary.queriesFailed++;
        summary.errors.push({ client_id: target.clientId, query: "(client)", message: message(e) });
        log(`[${target.domain}] ${message(e)}`);
      }
    }
  } finally {
    summary.costUsd = round5(summary.costUsd);
    if (summary.stopped) summary.errors.push({ client_id: "", query: "(run)", message: summary.stopped });
    await store.finishRun(runId, summary);
  }
  return summary;
}
