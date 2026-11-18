// Parser for Chrome UX Report API responses (queryRecord and queryHistoryRecord). Pure functions.
// Response shapes come from Google's official documentation (developer.chrome.com/docs/crux/api and /history-api).
// Notes from the docs: INP p75 is an integer in ms; CLS values are strings; missing history periods are null in
// p75s and the string "NaN" in densities; period dates are {year, month, day}.

export interface CruxDate {
  year: number;
  month: number;
  day: number;
}
export interface CruxPeriod {
  firstDate: CruxDate;
  lastDate: CruxDate;
}

export interface CruxPoint {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  inpP75Ms: number;
  inpGoodShare: number | null; // share of page loads with INP <= 200 ms
}

const INP = "interaction_to_next_paint";
const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: CruxDate) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;

const asNumber = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const validDate = (d: unknown): d is CruxDate =>
  !!d && typeof d === "object" && Number.isInteger((d as CruxDate).year) && Number.isInteger((d as CruxDate).month) && Number.isInteger((d as CruxDate).day);

/** queryRecord: the current 28-day window. Null if the record has no INP data. */
export function parseRecord(body: unknown): CruxPoint | null {
  const record = (body as { record?: Record<string, unknown> } | null)?.record as
    | { metrics?: Record<string, { histogram?: { start?: unknown; density?: unknown }[]; percentiles?: { p75?: unknown } }>; collectionPeriod?: CruxPeriod }
    | undefined;
  const inp = record?.metrics?.[INP];
  const p75 = asNumber(inp?.percentiles?.p75);
  const period = record?.collectionPeriod;
  if (p75 === null || !period || !validDate(period.firstDate) || !validDate(period.lastDate)) return null;

  const good = inp?.histogram?.find((b) => asNumber(b.start) === 0);
  return { periodStart: isoDate(period.firstDate), periodEnd: isoDate(period.lastDate), inpP75Ms: Math.round(p75), inpGoodShare: asNumber(good?.density) };
}

/** queryHistoryRecord: one point per weekly collection period, in ascending order. Periods without data are skipped. */
export function parseHistory(body: unknown): CruxPoint[] {
  const record = (body as { record?: Record<string, unknown> } | null)?.record as
    | {
        metrics?: Record<string, { histogramTimeseries?: { start?: unknown; densities?: unknown[] }[]; percentilesTimeseries?: { p75s?: unknown[] } }>;
        collectionPeriods?: CruxPeriod[];
      }
    | undefined;
  const inp = record?.metrics?.[INP];
  const p75s = inp?.percentilesTimeseries?.p75s;
  const periods = record?.collectionPeriods;
  if (!Array.isArray(p75s) || !Array.isArray(periods)) return [];

  const goodBin = inp?.histogramTimeseries?.find((b) => asNumber(b.start) === 0);
  const points: CruxPoint[] = [];
  p75s.forEach((raw, i) => {
    const p75 = asNumber(raw); // null (missing period) is skipped
    const period = periods[i];
    if (p75 === null || !period || !validDate(period.firstDate) || !validDate(period.lastDate)) return;
    points.push({
      periodStart: isoDate(period.firstDate),
      periodEnd: isoDate(period.lastDate),
      inpP75Ms: Math.round(p75),
      inpGoodShare: asNumber(goodBin?.densities?.[i]), // "NaN" becomes null
    });
  });
  return points;
}
