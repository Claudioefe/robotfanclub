// Parser for DataForSEO SERP and AI Mode results. Pure functions, ported from scripts/aio-watcher.mjs.
//
// Rules (CLAUDE.md, D-005, D-009):
// - A citation = a URL of the client's domain among the AI answer's references.
// - Off-top10 is judged by normalized URL (not by domain) against the same query's organic top 10 that day.
// - If the organic top 10 was not available, we do not claim anything about the organic rank (organic_checked = false).

export interface DfsReference {
  type?: string;
  domain?: string;
  url?: string;
  [key: string]: unknown;
}
export interface DfsItem {
  type?: string;
  rank_group?: number;
  url?: string;
  items?: DfsItem[];
  references?: DfsReference[];
  [key: string]: unknown;
}
export interface DfsResult {
  keyword?: string;
  items?: DfsItem[] | null;
  [key: string]: unknown;
}

export interface ParsedCitation {
  aio_present: boolean;
  cited: boolean;
  cited_url: string | null;
  source_position: number | null;
  source_count: number | null;
  organic_rank: number | null; // rank of the cited URL in the organic top 10; null = not there (or unknown, see organic_checked)
  organic_checked: boolean;
  other_domains: string[];
}

export const normHost = (h: unknown): string =>
  String(h ?? "")
    .toLowerCase()
    .replace(/^www\./, "");

/** host + path, lowercase host, no www, no query or hash, no trailing slash. Null if the URL is invalid. */
export function normUrl(u: unknown): string | null {
  try {
    const x = new URL(String(u));
    return normHost(x.hostname) + (x.pathname.replace(/\/+$/, "") || "/");
  } catch {
    return null;
  }
}

function hostOf(ref: DfsReference): string {
  if (ref.domain) return normHost(ref.domain);
  try {
    return normHost(new URL(String(ref.url)).hostname);
  } catch {
    return "";
  }
}

function urlHost(ref: DfsReference): string {
  try {
    return normHost(new URL(String(ref.url)).hostname);
  } catch {
    return "";
  }
}

/** The client's domain or any of its subdomains. "notnorthwindsec.com" does not match "northwindsec.com". */
export function isClientHost(host: string, clientDomain: string): boolean {
  const c = normHost(clientDomain);
  return host === c || host.endsWith(`.${c}`);
}

/** References can be nested (items, tables, expanded components): walk everything. */
export function collectRefs(node: unknown, out: DfsReference[] = []): DfsReference[] {
  if (Array.isArray(node)) {
    for (const n of node) collectRefs(n, out);
    return out;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj.type === "ai_overview_reference" && obj.url) out.push(obj as DfsReference);
    for (const v of Object.values(obj)) if (v && typeof v === "object") collectRefs(v, out);
  }
  return out;
}

/**
 * Organic results of positions 1 to 10 from a SERP result.
 * Null (unknown) when the result has no organic results at all: a real SERP always has some, so an empty one means
 * the call was blocked or came back empty. Treating it as "an empty top 10" would turn every citation into off-top10.
 */
export function organicTop10(serp: DfsResult | null | undefined): DfsItem[] | null {
  if (!serp || !Array.isArray(serp.items)) return null;
  const top = serp.items.filter((i) => i.type === "organic" && (i.rank_group ?? 99) <= 10);
  return top.length ? top : null;
}

/**
 * result: one DataForSEO result (organic SERP or AI Mode).
 * top10: the same query's organic top 10 from the same day, or null if it could not be fetched.
 */
export function parseCitation(result: DfsResult | null | undefined, clientDomain: string, top10: DfsItem[] | null): ParsedCitation {
  const organic_checked = top10 !== null;
  const aio = (result?.items ?? []).find((i) => i.type === "ai_overview");
  if (!aio) {
    return { aio_present: false, cited: false, cited_url: null, source_position: null, source_count: null, organic_rank: null, organic_checked, other_domains: [] };
  }

  // Dedupe by normalized URL, keeping the order of appearance.
  const unique = new Map<string, DfsReference>();
  for (const r of collectRefs(aio)) {
    const k = normUrl(r.url);
    if (k && !unique.has(k)) unique.set(k, r);
  }
  const refs = [...unique.values()];
  // A reference belongs to the client if either its domain field or its URL host matches.
  const isMine = (r: DfsReference) => isClientHost(hostOf(r), clientDomain) || isClientHost(urlHost(r), clientDomain);
  // If several client pages are cited, the first by source position defines the citation.
  const idx = refs.findIndex(isMine);
  const mine = idx >= 0 ? refs[idx] : null;

  const organic = mine && top10 ? top10.find((o) => normUrl(o.url) === normUrl(mine.url)) : null;
  const others = refs.filter((r) => r !== mine).map(hostOf).filter(Boolean);

  return {
    aio_present: true,
    cited: Boolean(mine),
    cited_url: mine?.url ?? null,
    source_position: mine ? idx + 1 : null,
    source_count: refs.length,
    organic_rank: organic ? (organic.rank_group ?? null) : null,
    organic_checked,
    other_domains: [...new Set(others)].slice(0, 10),
  };
}

export const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
