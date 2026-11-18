// Turns a DataForSEO LLM Mentions response into rows for ai_mentions. Pure: no network, no database.
// Platforms: "google" (AI Overview) and "chat_gpt". The data is a snapshot of DataForSEO's database of recorded AI answers,
// not a live measurement, so every row keeps the dates the answer was recorded.

export type Platform = "google" | "chat_gpt";
export const PLATFORMS: Platform[] = ["google", "chat_gpt"];

interface DfsRef {
  rank?: number | null;
  domain?: string | null;
  url?: string | null;
}

export interface DfsMention {
  platform?: string;
  question?: string;
  ai_search_volume?: number | null;
  first_response_at?: string | null;
  last_response_at?: string | null;
  sources?: DfsRef[] | null;
  search_results?: DfsRef[] | null;
}

export interface DfsMentionsResult {
  total_count?: number;
  items_count?: number;
  items?: DfsMention[] | null;
}

export interface MentionRow {
  question: string;
  ai_search_volume: number | null;
  first_response_at: string | null;
  last_response_at: string | null;
  relation: "cited" | "consulted";
  source_count: number;
  client_source_rank: number | null;
  client_url: string | null;
  other_domains: string[];
}

export interface ParsedMentions {
  totalCount: number;
  rows: MentionRow[];
  /** Items that did not carry the client at all (neither cited nor consulted): kept out, counted for transparency. */
  skipped: number;
}

/** "WWW.Example.com" -> "example.com". */
export const bareDomain = (host: string): string => host.trim().toLowerCase().replace(/^www\./, "");

/** True for the client's domain and its subdomains, never for a lookalike such as "notexample.com". */
export function isClientHost(host: string | null | undefined, clientDomain: string): boolean {
  if (!host) return false;
  const h = bareDomain(host);
  const d = bareDomain(clientDomain);
  return h === d || h.endsWith(`.${d}`);
}

/** DataForSEO timestamps look like "2025-12-03 15:09:47 +00:00". Returns ISO, or null when it cannot be read. */
export function toIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = Date.parse(value.replace(" ", "T").replace(" +", "+").replace(" ", ""));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function parseMentions(result: DfsMentionsResult, clientDomain: string): ParsedMentions {
  const rows: MentionRow[] = [];
  let skipped = 0;
  for (const item of result.items ?? []) {
    const question = (item.question ?? "").trim();
    if (!question) {
      skipped++;
      continue;
    }
    const sources = item.sources ?? [];
    const citedIndex = sources.findIndex((s) => isClientHost(s.domain, clientDomain));
    const consulted = (item.search_results ?? []).find((s) => isClientHost(s.domain, clientDomain));
    if (citedIndex < 0 && !consulted) {
      skipped++; // the answer mentions the brand in its text only: not provable from sources, so not claimed
      continue;
    }
    const cited = citedIndex >= 0;
    const ref = cited ? sources[citedIndex] : (consulted as DfsRef);
    const others: string[] = [];
    for (const s of sources) {
      const host = s.domain ? bareDomain(s.domain) : "";
      if (host && !isClientHost(host, clientDomain) && !others.includes(host)) others.push(host);
    }
    rows.push({
      question,
      ai_search_volume: typeof item.ai_search_volume === "number" ? item.ai_search_volume : null,
      first_response_at: toIso(item.first_response_at),
      last_response_at: toIso(item.last_response_at),
      relation: cited ? "cited" : "consulted",
      source_count: sources.length,
      client_source_rank: cited ? (typeof ref.rank === "number" ? ref.rank : citedIndex + 1) : null,
      client_url: ref.url ?? null,
      other_domains: others,
    });
  }
  return { totalCount: result.total_count ?? rows.length, rows, skipped };
}
