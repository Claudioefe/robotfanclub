// Mini-Scan, pure logic: validating a request, the shape of a result, and the outreach text. No database, no Next.js.
import { normalizeDomain, parseQueryList, type Parsed } from "../admin/validate.ts";

export const MAX_SCAN_QUERIES = 25;
export const WEEKLY_SCAN_CAP = 30; // total scans per rolling 7 days, for everyone (spec: Mini-Scan)
export const DAILY_SCANS_PER_VISITOR = 3; // per hashed IP, rolling 24 hours

/** How the feature is switched. "off" is the default: nothing can be submitted. */
export type ScanMode = "off" | "simulated" | "live";
export const scanMode = (raw: string | undefined): ScanMode => (raw === "simulated" || raw === "live" ? raw : "off");

export interface ScanRow {
  query: string;
  aiAnswer: boolean; // Google showed an AI Overview
  cited: boolean; // the scanned domain is among its sources
  citedUrl: string | null;
  sources: number;
  others: string[]; // sites cited instead
  error?: string; // the check failed: not counted either way
}

export interface ScanResult {
  rows: ScanRow[];
  checked: number; // queries that were checked successfully
  withAi: number;
  cited: number;
  failed: number;
}

export function summarize(rows: ScanRow[]): ScanResult {
  const ok = rows.filter((r) => !r.error);
  return { rows, checked: ok.length, withAi: ok.filter((r) => r.aiAnswer).length, cited: ok.filter((r) => r.cited).length, failed: rows.length - ok.length };
}

/** Queries where an AI answer exists and cites someone else: the "gap". */
export const gapRows = (r: ScanResult) => r.rows.filter((x) => !x.error && x.aiAnswer && !x.cited);

/** The sites cited most often in the gap queries, most frequent first. */
export function topCompetitors(r: ScanResult, limit = 5): { domain: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of gapRows(r)) for (const d of row.others) counts.set(d, (counts.get(d) ?? 0) + 1);
  return [...counts].map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)).slice(0, limit);
}

/** Copyable summary for outreach. Plain facts from the scan, no promises. */
export function outreachText(domain: string, r: ScanResult): string {
  const gap = gapRows(r).length;
  const lines = [
    `Google answers ${r.withAi} of ${r.checked} buying-intent queries with AI. ${domain} is cited in ${r.cited}.`,
    `Gap: ${gap} ${gap === 1 ? "query" : "queries"} where the AI answer cites other sites.`,
  ];
  const top = topCompetitors(r, 3);
  if (top.length) lines.push(`Cited instead most often: ${top.map((t) => `${t.domain} (${t.count})`).join(", ")}.`);
  return lines.join("\n");
}

/** A request from the public form. Rejects anything outside the limits before it can cost money. */
export function parseScanRequest(input: { domain: string; queries: string; website?: string }): Parsed<{ domain: string; queries: string[] }> {
  // `website` is a honeypot field hidden from people: only bots fill it in
  if (input.website && input.website.trim() !== "") return { ok: false, error: "Could not process this request." };
  const domain = normalizeDomain(input.domain);
  if (!domain) return { ok: false, error: "Enter a domain like example.com." };
  const list = parseQueryList(input.queries, MAX_SCAN_QUERIES);
  if (!list.ok) return list;
  return { ok: true, value: { domain, queries: list.value.queries } };
}
