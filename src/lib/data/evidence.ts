// Turns one stored raw check (a DataForSEO result) into something readable: the AI answer, its sources in order, and the
// organic top 10 of the same query. Pure: no database, no Next.js (runs under plain Node, used by the MCP server).
import { collectRefs, normHost, organicTop10, type DfsItem, type DfsResult } from "../../../jobs/watcher/parser.ts";

export interface EvidenceSummary {
  query: string | null;
  itemTypes: string[];
  aiAnswer: { present: boolean; text: string | null; textTruncated: boolean; sources: { position: number; domain: string; url: string; googleOwnLink: boolean }[] };
  organicTop10: { rank: number | null; domain: string; url: string }[] | null;
  peopleAlsoAsk: string[];
}

/** Text of the AI answer: every text element, in order. */
function answerText(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const n of node) answerText(n, out);
  } else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.text === "string" && /element|markdown|text/.test(String(o.type ?? ""))) out.push(o.text);
    for (const v of Object.values(o)) if (v && typeof v === "object") answerText(v, out);
  }
  return out;
}

export function summarizeEvidence(result: DfsResult, maxText = 4000): EvidenceSummary {
  const items = Array.isArray(result.items) ? (result.items as DfsItem[]) : [];
  const ai = items.find((i) => i.type === "ai_overview");
  const seen = new Set<string>();
  const sources = ai
    ? collectRefs(ai)
        .filter((r) => r.url && !seen.has(r.url) && seen.add(r.url))
        .map((r, i) => {
          const url = String(r.url);
          const domain = normHost(r.domain ?? (() => { try { return new URL(url).hostname; } catch { return ""; } })());
          return { position: i + 1, domain, url, googleOwnLink: domain === "google.com" || domain.endsWith(".google.com") };
        })
    : [];
  const full = ai ? answerText(ai).join(" ").replace(/\s+/g, " ").trim() : "";
  const top = organicTop10(result);
  const paa = items.find((i) => i.type === "people_also_ask");
  return {
    query: typeof result.keyword === "string" ? result.keyword : null,
    itemTypes: [...new Set(items.map((i) => String(i.type)))],
    aiAnswer: { present: Boolean(ai), text: ai ? full.slice(0, maxText) : null, textTruncated: full.length > maxText, sources },
    organicTop10: top ? top.map((i) => ({ rank: i.rank_group ?? null, domain: normHost(String(i.domain ?? "")), url: String(i.url ?? "") })) : null,
    peopleAlsoAsk: ((paa?.items as { title?: string }[] | undefined) ?? []).map((x) => String(x.title ?? "")).filter(Boolean),
  };
}
