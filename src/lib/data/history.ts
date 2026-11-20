// Day-by-day history of the AI citation checks (D-047). Pure functions, no database and no Next.js: the data core feeds
// them rows and the portal (and, later, the MCP server) draws what they return.
//
// Why this exists: a 60-day window holds thousands of checks. The portal compresses each query's history into one strip
// of small cells (one per day) so the table does not grow with the days. The rule that makes the strip honest:
//   "cited"    the client was among the sources of an AI answer that day
//   "gap"      an AI answer existed but did not cite the client
//   "no_ai"    Google showed no AI answer that day (this is NOT a lost citation)
//   "unchecked" no check was stored for that day (a gap in the series, or the day has not come yet)

import { addDays } from "../sla.ts";

export type Surface = "ai_overview" | "ai_mode";
export const HISTORY_SURFACES: Surface[] = ["ai_overview", "ai_mode"];

export type DayState = "cited" | "gap" | "no_ai" | "unchecked";

/** The columns of one stored check that the history needs. */
export interface CheckRow {
  query: string;
  surface: Surface;
  checked_on: string;
  aio_present: boolean;
  cited: boolean;
}

export interface QueryHistory {
  query: string;
  /** One state per day in `days`, per surface. */
  surfaces: Record<Surface, DayState[]>;
  /** One state per day for the query as a whole (cited on any surface beats a gap beats no AI answer). */
  combined: DayState[];
  /** Days on which the client was cited, on either surface. */
  daysCited: number;
  /** Days on which an AI answer existed, on either surface: the base of "days cited: N of M". */
  daysWithAi: number;
  /** Days with at least one stored check. */
  daysChecked: number;
}

export interface DayPoint {
  day: string;
  /** False when no check at all was stored that day (the series has a gap): the chart draws nothing for it. */
  checked: boolean;
  /** Queries cited on this day (either surface). */
  citedThatDay: number;
  /** Queries cited on this day or any earlier day of the window: the number the SLA counts. */
  cumulative: number;
}

export interface HistoryData {
  frozenFrom: string;
  frozenUntil: string;
  /** Every day from the window start to the last day with a stored check (or the window end). */
  days: string[];
  queries: QueryHistory[];
  daily: DayPoint[];
}

export const combine = (states: DayState[]): DayState => {
  if (states.includes("cited")) return "cited";
  if (states.includes("gap")) return "gap";
  if (states.includes("no_ai")) return "no_ai";
  return "unchecked";
};

export const checkState = (row: Pick<CheckRow, "aio_present" | "cited"> | undefined): DayState => {
  if (!row) return "unchecked";
  if (row.cited) return "cited"; // a citation implies an AI answer, whatever aio_present says
  return row.aio_present ? "gap" : "no_ai";
};

/** Every ISO day from `from` to `to`, both included. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * Builds the history of a frozen window. `today` caps the days shown (a window that has not finished yet only has the
 * days that already happened). Checks outside the window, or for queries that are not in the frozen list, are ignored,
 * as the SLA views do.
 */
export function buildHistory(args: {
  frozenFrom: string;
  frozenUntil: string;
  today: string;
  queries: string[];
  checks: CheckRow[];
}): HistoryData {
  const { frozenFrom, frozenUntil, today, queries, checks } = args;
  const last = today < frozenUntil ? today : frozenUntil;
  const days = last >= frozenFrom ? daysBetween(frozenFrom, last) : [];
  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const listed = new Set(queries);

  // query -> surface -> day index -> the check (if the same day appears twice, a cited one wins: the SLA counts it).
  const byQuery = new Map<string, Record<Surface, Map<number, CheckRow>>>();
  for (const c of checks) {
    const i = dayIndex.get(c.checked_on);
    if (i === undefined || !listed.has(c.query)) continue;
    let entry = byQuery.get(c.query);
    if (!entry) byQuery.set(c.query, (entry = { ai_overview: new Map(), ai_mode: new Map() }));
    const previous = entry[c.surface].get(i);
    if (!previous || (c.cited && !previous.cited)) entry[c.surface].set(i, c);
  }

  const histories: QueryHistory[] = queries.map((query) => {
    const entry = byQuery.get(query);
    const surfaces = {} as Record<Surface, DayState[]>;
    for (const s of HISTORY_SURFACES) surfaces[s] = days.map((_, i) => checkState(entry?.[s].get(i)));
    const combined = days.map((_, i) => combine(HISTORY_SURFACES.map((s) => surfaces[s][i])));
    return {
      query,
      surfaces,
      combined,
      daysCited: combined.filter((s) => s === "cited").length,
      daysWithAi: combined.filter((s) => s === "cited" || s === "gap").length,
      daysChecked: combined.filter((s) => s !== "unchecked").length,
    };
  });

  const seen = new Set<string>();
  const daily: DayPoint[] = days.map((day, i) => {
    let citedThatDay = 0;
    for (const h of histories) {
      if (h.combined[i] === "cited") {
        citedThatDay++;
        seen.add(h.query);
      }
    }
    return { day, checked: histories.some((h) => h.combined[i] !== "unchecked"), citedThatDay, cumulative: seen.size };
  });

  return { frozenFrom, frozenUntil, days, queries: histories, daily };
}
