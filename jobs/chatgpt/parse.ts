// Turns one DataForSEO ChatGPT LLM Scraper response into the facts the portal stores (D-048). Pure: no network, no database.
// Plain relative imports: this file also runs under plain Node (scripts and, later, a job).

import { isClientHost, normHost } from "../watcher/parser.ts";

export type Relation = "cited" | "consulted" | "none";

export interface ParsedRun {
  query: string;
  runAt: string; // ISO timestamp
  runOn: string; // YYYY-MM-DD, UTC
  relation: Relation;
  sourceCount: number;
  clientSourceRank: number | null;
  clientUrl: string | null;
  otherDomains: string[];
  consultedCount: number;
  costUsd: number;
}

interface Item {
  domain?: string | null;
  url?: string | null;
}
interface DfsTask {
  cost?: number;
  result?: { keyword?: string; datetime?: string; sources?: Item[] | null; search_results?: Item[] | null }[] | null;
}

const hostOf = (i: Item): string => {
  if (i.domain) return normHost(i.domain);
  try {
    return normHost(new URL(String(i.url)).hostname);
  } catch {
    return "";
  }
};

/** "2026-11-20 14:08:42 +00:00" is what DataForSEO sends. */
export function parseDatetime(s: string | undefined): string {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2}:\d{2})$/.exec(s ?? "");
  if (!m) throw new Error(`Unexpected datetime: ${s}`);
  return new Date(`${m[1]}T${m[2]}${m[3]}`).toISOString();
}

/** `task` is tasks[0] of the response. Throws when it carries no result: a failed call is not a run and must not be stored. */
export function parseRun(task: DfsTask, clientDomain: string): ParsedRun {
  const r = task.result?.[0];
  if (!r) throw new Error("The task has no result");
  if (!r.keyword) throw new Error("The result has no keyword");
  const sources = r.sources ?? [];
  const consulted = r.search_results ?? [];

  const rankIndex = sources.findIndex((s) => isClientHost(hostOf(s), clientDomain));
  const consultedClient = consulted.filter((s) => isClientHost(hostOf(s), clientDomain));
  const relation: Relation = rankIndex >= 0 ? "cited" : consultedClient.length ? "consulted" : "none";

  const others: string[] = [];
  for (const s of sources) {
    const h = hostOf(s);
    if (h && !isClientHost(h, clientDomain) && !others.includes(h)) others.push(h);
  }

  const runAt = parseDatetime(r.datetime);
  return {
    query: r.keyword,
    runAt,
    runOn: runAt.slice(0, 10),
    relation,
    sourceCount: sources.length,
    clientSourceRank: rankIndex >= 0 ? rankIndex + 1 : null,
    clientUrl: (rankIndex >= 0 ? sources[rankIndex].url : consultedClient[0]?.url) ?? null,
    otherDomains: others,
    consultedCount: consulted.length,
    costUsd: Number(task.cost ?? 0),
  };
}
