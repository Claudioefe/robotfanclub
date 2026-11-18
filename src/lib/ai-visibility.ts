// Pure view logic for the AI visibility module (D-040). No database, no framework: tested on its own.
// This module is informational. It reads a snapshot of DataForSEO's database of recorded AI answers; it is not the
// citation SLA (frozen list, fixed daily conditions) and nothing here counts toward the credit.

export type Platform = "google" | "chat_gpt";
export const PLATFORM_LABEL: Record<Platform, string> = { google: "Google AI Overview", chat_gpt: "ChatGPT" };

export interface MentionView {
  platform: Platform;
  question: string;
  aiSearchVolume: number | null;
  firstResponseAt: string | null;
  lastResponseAt: string | null;
  relation: "cited" | "consulted";
  sourceCount: number;
  clientSourceRank: number | null;
  clientUrl: string | null;
  otherDomains: string[];
}

export interface RunView {
  platform: Platform;
  capturedOn: string; // YYYY-MM-DD
  totalCount: number;
  rowsStored: number;
}

/** "What's the rarest Dr. Seuss book?" and "what is the rarest dr seuss book" are close, but not the same: only case, punctuation and spacing are folded. */
export const normalizeQuestion = (q: string): string =>
  q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export interface Coverage {
  platform: Platform;
  total: number; // answers in DataForSEO's database that mention the domain
  shown: number; // rows we keep (the top ones by search volume)
  cited: number;
  consulted: number;
  capturedOn: string | null;
}

export function coverage(runs: RunView[], mentions: MentionView[]): Coverage[] {
  return (["google", "chat_gpt"] as Platform[]).map((platform) => {
    const run = runs.filter((r) => r.platform === platform).sort((a, b) => b.capturedOn.localeCompare(a.capturedOn))[0];
    const rows = mentions.filter((m) => m.platform === platform);
    return {
      platform,
      total: run?.totalCount ?? 0,
      shown: rows.length,
      cited: rows.filter((m) => m.relation === "cited").length,
      consulted: rows.filter((m) => m.relation === "consulted").length,
      capturedOn: run?.capturedOn ?? null,
    };
  });
}

export interface QuestionRow {
  question: string;
  volume: number | null;
  platforms: { platform: Platform; relation: "cited" | "consulted"; rank: number | null; sourceCount: number; url: string | null; lastResponseAt: string | null }[];
  others: string[];
}

/** One row per question, with what each platform did. Ordered by AI search volume, then alphabetically so the order is stable. */
export function questionRows(mentions: MentionView[]): QuestionRow[] {
  const byKey = new Map<string, QuestionRow>();
  for (const m of mentions) {
    const key = normalizeQuestion(m.question);
    let row = byKey.get(key);
    if (!row) {
      row = { question: m.question, volume: m.aiSearchVolume, platforms: [], others: [] };
      byKey.set(key, row);
    }
    if ((m.aiSearchVolume ?? -1) > (row.volume ?? -1)) row.volume = m.aiSearchVolume;
    row.platforms.push({ platform: m.platform, relation: m.relation, rank: m.clientSourceRank, sourceCount: m.sourceCount, url: m.clientUrl, lastResponseAt: m.lastResponseAt });
    for (const d of m.otherDomains) if (!row.others.includes(d)) row.others.push(d);
  }
  return [...byKey.values()].sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1) || a.question.localeCompare(b.question));
}

export interface Competitor {
  domain: string;
  answers: number;
}

/** Domains cited next to the client, by how many of the stored answers they appear in. */
export function competitors(mentions: MentionView[], limit = 8): Competitor[] {
  const counts = new Map<string, number>();
  for (const m of mentions) for (const d of new Set(m.otherDomains)) counts.set(d, (counts.get(d) ?? 0) + 1);
  return [...counts.entries()]
    .map(([domain, answers]) => ({ domain, answers }))
    .sort((a, b) => b.answers - a.answers || a.domain.localeCompare(b.domain))
    .slice(0, limit);
}

/** Whole days between an ISO timestamp and today (UTC), never negative. */
export function daysAgo(iso: string, today: string): number {
  return Math.max(0, Math.floor((Date.parse(today) - Date.parse(iso.slice(0, 10))) / 864e5));
}

export interface Freshness {
  newest: string | null;
  oldest: string | null;
  monthsSpread: number;
}

/** When the answers behind the stored rows were recorded. They are not from the capture day: some are months old. */
export function freshness(mentions: MentionView[]): Freshness {
  const dates = mentions.map((m) => m.lastResponseAt).filter((d): d is string => Boolean(d)).sort();
  if (!dates.length) return { newest: null, oldest: null, monthsSpread: 0 };
  const spread = (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / (30 * 864e5);
  return { newest: dates[dates.length - 1], oldest: dates[0], monthsSpread: Math.round(spread) };
}

export interface QueryIdea {
  query: string;
  volume: number | null;
}

/**
 * Questions worth freezing for the citation SLA: the client is already cited by Google's AI (the surface the SLA
 * measures), ordered by AI search volume, skipping what is already frozen. Questions from ChatGPT are not suggested
 * as such: the SLA is measured on Google, so a ChatGPT-only question is no evidence it triggers a Google AI answer.
 */
export function queryIdeas(mentions: MentionView[], frozen: string[], limit = 25): QueryIdea[] {
  const taken = new Set(frozen.map(normalizeQuestion));
  const seen = new Set<string>();
  const ideas: QueryIdea[] = [];
  for (const m of [...mentions].sort((a, b) => (b.aiSearchVolume ?? -1) - (a.aiSearchVolume ?? -1))) {
    if (m.platform !== "google" || m.relation !== "cited") continue;
    const key = normalizeQuestion(m.question);
    if (!key || taken.has(key) || seen.has(key)) continue;
    seen.add(key);
    ideas.push({ query: m.question, volume: m.aiSearchVolume });
    if (ideas.length >= limit) break;
  }
  return ideas;
}
