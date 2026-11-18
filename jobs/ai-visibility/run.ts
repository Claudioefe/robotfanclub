// AI visibility job: for each client and platform, reads where AI answers mention the client's domain and stores it.
// Idempotent per (client, platform, UTC day). The raw response is saved first (evidence), then the rows that point to it.
import { createHash } from "node:crypto";
import { isFatal, isTransient } from "../watcher/dataforseo.ts";
import { PLATFORMS, parseMentions, type MentionRow, type Platform } from "./parser.ts";
import { estimateCostUsd, type MentionsSource } from "./source.ts";

export interface StoredTarget {
  clientId: string;
  domain: string;
}

export interface RunRow {
  client_id: string;
  platform: Platform;
  captured_on: string;
  total_count: number;
  rows_stored: number;
  snapshot_path: string;
  cost_usd: number;
}

export interface AiVisibilityStore {
  /** Dry-run reads only sandbox clients; live reads only real clients (a paid call is never spent on demo or sandbox data). */
  targets(live: boolean): Promise<StoredTarget[]>;
  hasRun(clientId: string, platform: Platform, day: string): Promise<boolean>;
  saveSnapshot(path: string, json: string): Promise<void>;
  /** Writes the run and its rows together. If the rows fail, the run must not stay behind (it would block the retry). */
  insertRun(run: RunRow, rows: MentionRow[]): Promise<void>;
}

export interface RunOptions {
  live: boolean;
  /** Stops before a call that could push the day's spend over this. */
  maxCostUsd: number;
  /** Rows requested per call, used only to estimate cost before spending. */
  limit: number;
  now?: Date;
  retryWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

export interface Summary {
  targets: number;
  calls: number;
  skipped: number;
  failed: number;
  rows: number;
  costUsd: number;
  stopped: string | null;
  errors: { client_id: string; platform: Platform; message: string }[];
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

export function snapshotPath(clientId: string, day: string, platform: Platform, now: Date): string {
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `${clientId}/ai-visibility/${day}/${platform}-${createHash("sha1").update(clientId + platform).digest("hex").slice(0, 6)}-${time}.json`;
}

export async function runAiVisibility(store: AiVisibilityStore, source: MentionsSource, options: RunOptions): Promise<Summary> {
  const now = options.now ?? new Date();
  const day = now.toISOString().slice(0, 10);
  const wait = options.retryWaitMs ?? 5000;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = options.log ?? (() => {});
  const summary: Summary = { targets: 0, calls: 0, skipped: 0, failed: 0, rows: 0, costUsd: 0, stopped: null, errors: [] };

  stop: for (const target of await store.targets(options.live)) {
    summary.targets++;
    for (const platform of PLATFORMS) {
      if (await store.hasRun(target.clientId, platform, day)) {
        summary.skipped++;
        continue;
      }
      if (summary.costUsd + estimateCostUsd(options.limit) > options.maxCostUsd) {
        summary.stopped = `Stopped before spending more than USD ${options.maxCostUsd.toFixed(2)} (spent ${summary.costUsd.toFixed(3)}).`;
        break stop;
      }
      try {
        const lookFor = source.matchDomain?.(target.domain) ?? target.domain;
        let task;
        try {
          task = await source.mentions(lookFor, platform);
        } catch (e) {
          if (!isTransient(e)) throw e;
          await sleep(wait); // one retry only
          task = await source.mentions(lookFor, platform);
        }
        summary.calls++;
        summary.costUsd += task.cost;
        const parsed = parseMentions(task.result, lookFor);
        const path = snapshotPath(target.clientId, day, platform, now);
        await store.saveSnapshot(path, JSON.stringify(task.result));
        await store.insertRun(
          { client_id: target.clientId, platform, captured_on: day, total_count: parsed.totalCount, rows_stored: parsed.rows.length, snapshot_path: path, cost_usd: task.cost },
          parsed.rows,
        );
        summary.rows += parsed.rows.length;
      } catch (e) {
        summary.failed++;
        summary.errors.push({ client_id: target.clientId, platform, message: message(e) });
        log(`[${target.domain} ${platform}] ${message(e)}`);
        if (isFatal(e)) {
          summary.stopped = `Stopped: ${message(e)}`;
          break stop;
        }
      }
    }
  }
  return summary;
}
