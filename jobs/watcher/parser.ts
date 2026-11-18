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

/** A Google redirect link (google.com/goto?url=<encrypted>) that was not resolved to its real destination. */
export function isGotoUrl(url: unknown): boolean {
  try {
    const u = new URL(String(url));
    return normHost(u.hostname) === "google.com" && u.pathname.startsWith("/goto");
  } catch {
    return false;
  }
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
  /** AI answer references that are unresolved Google redirects: their real site is unknown, so a client citation could hide there. */
  unresolved_refs: number;
}

export const normHost = (h: unknown): string =>
  String(h ?? "")
    .toLowerCase()
    .replace(/^www\./, "");

// Parameters that only track campaigns or clicks and never change which page is shown.
const TRACKING_PARAM = /^(utm_.+|gclid|gbraid|wbraid|fbclid|msclkid|dclid|mc_cid|mc_eid|igshid|_ga|_gl)$/i;

/**
 * host + path + the query parameters that identify the page, sorted. Lowercase host, no www, no hash, no trailing slash,
 * no tracking parameters. Null if the URL is invalid.
 * Query parameters matter: YouTube's ?v=<id> or a CMS's ?p=123 are the page's identity (D-035).
 */
export function normUrl(u: unknown): string | null {
  try {
    const x = new URL(String(u));
    const kept = [...x.searchParams.entries()]
      .filter(([k]) => !TRACKING_PARAM.test(k))
      .sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
    const query = kept.length ? `?${new URLSearchParams(kept).toString()}` : "";
    return normHost(x.hostname) + (x.pathname.replace(/\/+$/, "") || "/") + query;
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
    return { aio_present: false, cited: false, cited_url: null, source_position: null, source_count: null, organic_rank: null, organic_checked, other_domains: [], unresolved_refs: 0 };
  }

  // Dedupe by normalized URL, keeping the order of appearance.
  const unique = new Map<string, DfsReference>();
  for (const r of collectRefs(aio)) {
    // Unresolved Google redirects differ only in their query string, which normUrl drops: key them by the full URL
    // so two different hidden sources are not merged into one.
    const k = isGotoUrl(r.url) ? String(r.url) : normUrl(r.url);
    if (k && !unique.has(k)) unique.set(k, r);
  }
  const refs = [...unique.values()];
  // A reference belongs to the client if either its domain field or its URL host matches.
  const isMine = (r: DfsReference) => isClientHost(hostOf(r), clientDomain) || isClientHost(urlHost(r), clientDomain);
  // If several client pages are cited, the first by source position defines the citation.
  const idx = refs.findIndex(isMine);
  const mine = idx >= 0 ? refs[idx] : null;

  const organic = mine && top10 ? top10.find((o) => normUrl(o.url) === normUrl(mine.url)) : null;
  // Unresolved redirects in the top 10 hide their real URLs. If the cited page is not among the resolved results we
  // cannot say it is outside the top 10: the organic rank is unknown, never "off" (D-033).
  const unresolvedOrganic = top10 ? top10.filter((o) => isGotoUrl(o.url)).length : 0;
  const rankKnown = organic !== null && organic !== undefined ? true : unresolvedOrganic === 0;
  const others = refs.filter((r) => r !== mine && !isGotoUrl(r.url)).map(hostOf).filter(Boolean);

  return {
    aio_present: true,
    cited: Boolean(mine),
    cited_url: mine?.url ?? null,
    source_position: mine ? idx + 1 : null,
    source_count: refs.length,
    organic_rank: organic ? (organic.rank_group ?? null) : null,
    organic_checked: organic_checked && (!mine || rankKnown),
    other_domains: [...new Set(others)].slice(0, 10),
    unresolved_refs: refs.filter((r) => isGotoUrl(r.url)).length,
  };
}

export const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
