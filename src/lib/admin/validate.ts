// Validation for the staff Admin. Pure functions (no database, no Next.js), so they are easy to test.
// Every value that reaches the database from a form goes through one of these first.
import { SLA, addDays } from "../sla.ts";

export const CLIENT_KINDS = ["real", "demo", "sandbox"] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];

export const MAX_QUERIES = 60;
const MAX_QUERY_LENGTH = 200;

type Valid<T> = { ok: true; value: T };
type Invalid = { ok: false; error: string };
export type Parsed<T> = Valid<T> | Invalid;
const ok = <T>(value: T): Valid<T> => ({ ok: true, value });
const bad = (error: string): Invalid => ({ ok: false, error });

/** "https://www.Example.com/path" -> "example.com". Null if it does not look like a domain. */
export function normalizeDomain(input: string): string | null {
  const d = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : null;
}

export function parseClient(input: { name: string; domain: string; kind: string; feeUsd: string }): Parsed<{ name: string; domain: string; kind: ClientKind; feeUsd: number | null }> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 120) return bad("Enter a name of up to 120 characters.");
  const domain = normalizeDomain(input.domain);
  if (!domain) return bad("Enter a domain like example.com (no path).");
  if (!CLIENT_KINDS.includes(input.kind as ClientKind)) return bad("Choose a kind: real, demo or sandbox.");
  let feeUsd: number | null = null;
  if (input.feeUsd.trim() !== "") {
    feeUsd = Number(input.feeUsd);
    if (!Number.isFinite(feeUsd) || feeUsd < 0 || feeUsd > 10_000_000) return bad("The fee must be a number of dollars, 0 or more.");
  }
  return ok({ name, domain, kind: input.kind as ClientKind, feeUsd });
}

/** One query per line. Trims, collapses spaces, drops blanks, removes duplicates ignoring case. */
export function parseQueryList(text: string): Parsed<{ queries: string[]; duplicatesRemoved: number }> {
  const seen = new Set<string>();
  const queries: string[] = [];
  let duplicatesRemoved = 0;
  for (const raw of text.split(/\r?\n/)) {
    const q = raw.trim().replace(/\s+/g, " ");
    if (!q) continue;
    if (q.length > MAX_QUERY_LENGTH) return bad(`A query is longer than ${MAX_QUERY_LENGTH} characters: "${q.slice(0, 40)}…"`);
    const key = q.toLowerCase();
    if (seen.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(key);
    queries.push(q);
  }
  if (!queries.length) return bad("Add at least one query, one per line.");
  if (queries.length > MAX_QUERIES) return bad(`A window holds at most ${MAX_QUERIES} queries (you entered ${queries.length}).`);
  return ok({ queries, duplicatesRemoved });
}

/** A 60-day window starting at `from` (inclusive): the last day is from + 59. */
export const windowFrom = (from: string) => ({ from, until: addDays(from, SLA.windowDays - 1) });

/**
 * A frozen list is never edited: a new list is a new window. If a window is still running, the new one starts the day
 * after it ends, so windows never overlap (the database rejects overlaps too).
 */
export function nextWindowStart(today: string, existingUntil: string[]): string {
  const latest = existingUntil.reduce<string | null>((max, u) => (max === null || u > max ? u : max), null);
  return latest !== null && latest >= today ? addDays(latest, 1) : today;
}

export function parseSprint(input: { deployedOn: string; baselineMs: string }): Parsed<{ deployedOn: string | null; baselineMs: number | null }> {
  const d = input.deployedOn.trim();
  if (d !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`)))) return bad("Enter the deploy date as YYYY-MM-DD.");
  const b = input.baselineMs.trim();
  let baselineMs: number | null = null;
  if (b !== "") {
    baselineMs = Number(b);
    if (!Number.isInteger(baselineMs) || baselineMs <= 0 || baselineMs > 60_000) return bad("The baseline INP must be a whole number of milliseconds.");
  }
  return ok({ deployedOn: d === "" ? null : d, baselineMs });
}

/** CrUX distinguishes https://www.x.com from https://x.com: the origin is kept exactly, without a path. */
export function parseCruxTarget(scope: string, raw: string): Parsed<{ scope: "origin" | "url"; target: string }> {
  if (scope !== "origin" && scope !== "url") return bad("Choose origin or url.");
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return bad("Enter a full address starting with https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return bad("Enter a full address starting with https://");
  return ok({ scope, target: scope === "origin" ? url.origin : url.toString() });
}

export const TAG_ACTION_VALUES = ["keep", "load_on_first_interaction", "move_server_side", "remove"] as const;
export type TagActionValue = (typeof TAG_ACTION_VALUES)[number];

export function parseTagScript(input: { label: string; scriptUrl: string; blockingMs: string; action: string; isRequired: boolean }): Parsed<{
  label: string;
  scriptUrl: string;
  scriptHost: string;
  blockingMs: number;
  action: TagActionValue;
  isRequired: boolean;
}> {
  const label = input.label.trim().replace(/\s+/g, " ");
  if (!label || label.length > 120) return bad("Enter a name of up to 120 characters.");
  let url: URL;
  try {
    url = new URL(input.scriptUrl.trim());
  } catch {
    return bad("Enter the script's full address starting with https://");
  }
  const blockingMs = Number(input.blockingMs);
  if (!Number.isInteger(blockingMs) || blockingMs < 0 || blockingMs > 60_000) return bad("Blocking time must be a whole number of milliseconds.");
  if (!TAG_ACTION_VALUES.includes(input.action as TagActionValue)) return bad("Choose an action.");
  // A required script (for example the consent banner) cannot be removed.
  if (input.isRequired && input.action === "remove") return bad("A required script cannot be removed.");
  return ok({ label, scriptUrl: url.toString(), scriptHost: url.hostname, blockingMs, action: input.action as TagActionValue, isRequired: input.isRequired });
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
