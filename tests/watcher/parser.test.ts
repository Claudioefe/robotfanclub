import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectRefs, isClientHost, normUrl, organicTop10, parseCitation, slug, type DfsResult } from "../../jobs/watcher/parser.ts";

const fixture = (name: string): DfsResult => JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8")).tasks[0].result[0];
const organic = fixture("dfs-organic-sample.json");
const aiMode = fixture("dfs-ai-mode-sample.json");
const aio = (...refs: { domain?: string; url: string }[]): DfsResult => ({
  items: [{ type: "ai_overview", items: [{ type: "ai_overview_element", references: refs.map((r) => ({ type: "ai_overview_reference", ...r })) }] }],
});

describe("normalization", () => {
  it("compares URLs by host and path only", () => {
    expect(normUrl("https://www.Northwindsec.com/facts/soc-2/?utm_source=x#top")).toBe("northwindsec.com/facts/soc-2");
    expect(normUrl("http://northwindsec.com/")).toBe("northwindsec.com/");
    expect(normUrl("not a url")).toBeNull();
  });
  it("matches the client domain and its subdomains, not look-alikes", () => {
    expect(isClientHost("northwindsec.com", "www.northwindsec.com")).toBe(true);
    expect(isClientHost("docs.northwindsec.com", "northwindsec.com")).toBe(true);
    expect(isClientHost("notnorthwindsec.com", "northwindsec.com")).toBe(false);
    expect(isClientHost("northwindsec.com.evil.io", "northwindsec.com")).toBe(false);
  });
  it("slugs queries for snapshot paths", () => {
    expect(slug("SOC 2: Type 1 vs Type 2?")).toBe("soc-2-type-1-vs-type-2");
    expect(slug("x".repeat(200))).toHaveLength(80);
  });
});

describe("AI Overview fixture", () => {
  const top10 = organicTop10(organic);

  it("keeps only organic results of positions 1 to 10", () => {
    expect(top10).toHaveLength(3);
    expect(organicTop10({ items: null })).toBeNull();
    // A SERP without any organic result is unknown, not "an empty top 10"
    expect(organicTop10({ items: [{ type: "ai_overview" }] })).toBeNull();
    expect(organicTop10({ items: [] })).toBeNull();
    expect(organicTop10(null)).toBeNull();
  });

  it("finds the citation inside nested references, deduped by URL, with the right position", () => {
    const c = parseCitation(organic, "northwindsec.com", top10);
    expect(c).toMatchObject({
      aio_present: true,
      cited: true,
      cited_url: "https://www.northwindsec.com/facts/soc-2?utm_source=x",
      source_position: 2, // trustkit.com/soc2 appears twice (one with a trailing slash) and counts once
      source_count: 3,
      organic_checked: true,
    });
    expect(c.other_domains).toEqual(["trustkit.com", "auditly.io"]);
  });

  it("is off the top 10 because the cited page is not among the organic results (URL, not domain)", () => {
    // The domain does rank (rank 3, /blog/soc-2-timeline), but the cited page is /facts/soc-2.
    expect(parseCitation(organic, "northwindsec.com", top10).organic_rank).toBeNull();
  });
});

describe("AI Mode fixture", () => {
  it("is inside the top 10 when the exact page ranks organically", () => {
    const c = parseCitation(aiMode, "northwindsec.com", organicTop10(organic));
    expect(c).toMatchObject({ cited: true, source_position: 1, source_count: 2, organic_rank: 3, organic_checked: true });
  });
});

describe("edge cases", () => {
  it("reports no AI answer", () => {
    expect(parseCitation({ items: [{ type: "organic", rank_group: 1, url: "https://a.com" }] }, "x.com", [])).toMatchObject({
      aio_present: false,
      cited: false,
      cited_url: null,
    });
    expect(parseCitation(null, "x.com", [])).toMatchObject({ aio_present: false, cited: false });
  });

  it("reports an AI answer that does not cite the client", () => {
    const c = parseCitation(aio({ domain: "a.com", url: "https://a.com/1" }, { domain: "b.com", url: "https://b.com/1" }), "x.com", []);
    expect(c).toMatchObject({ aio_present: true, cited: false, source_position: null, source_count: 2, other_domains: ["a.com", "b.com"] });
  });

  it("derives the host from the URL when the reference has no domain", () => {
    expect(parseCitation(aio({ url: "https://docs.x.com/page" }), "x.com", []).cited).toBe(true);
  });

  it("does not guess the organic rank when the top 10 is unknown", () => {
    const c = parseCitation(aio({ url: "https://x.com/a" }), "x.com", null);
    expect(c).toMatchObject({ cited: true, organic_rank: null, organic_checked: false });
  });

  it("collects references from tables and nested components", () => {
    const refs = collectRefs({ items: [{ items: [{ table: { rows: [{ type: "ai_overview_reference", url: "https://t.com" }] } }] }] });
    expect(refs).toHaveLength(1);
  });

  it("matches the client by URL host when the domain field is a display name", () => {
    expect(parseCitation(aio({ domain: "Northwind Security", url: "https://www.x.com/a" }), "x.com", []).cited).toBe(true);
  });

  it("uses the first client page by source position when several are cited", () => {
    const c = parseCitation(aio({ url: "https://other.com/1" }, { url: "https://x.com/b" }, { url: "https://x.com/a" }), "x.com", []);
    expect(c).toMatchObject({ cited_url: "https://x.com/b", source_position: 2, source_count: 3 });
  });

  it("keeps two different unresolved redirects apart and counts them", () => {
    const c = parseCitation(aio({ url: "https://google.com/goto?url=AAA" }, { url: "https://google.com/goto?url=BBB" }, { url: "https://x.com/a" }), "x.com", []);
    expect(c).toMatchObject({ source_count: 3, unresolved_refs: 2, source_position: 3 });
    expect(c.other_domains).toEqual([]); // a redirect says nothing about the real site
  });

  it("organic rank is unknown, not 'off', when the top 10 hides pages behind unresolved redirects", () => {
    const top = [
      { type: "organic", rank_group: 1, url: "https://google.com/goto?url=AAA" },
      { type: "organic", rank_group: 2, url: "https://other.com/p" },
    ];
    expect(parseCitation(aio({ url: "https://x.com/a" }), "x.com", top)).toMatchObject({ organic_rank: null, organic_checked: false });
    // If the cited page is found among the resolved results, the rank is known even with redirects around it
    const found = [...top, { type: "organic", rank_group: 3, url: "https://x.com/a" }];
    expect(parseCitation(aio({ url: "https://x.com/a" }), "x.com", found)).toMatchObject({ organic_rank: 3, organic_checked: true });
    // With every result resolved and the page absent, it really is outside the top 10
    expect(parseCitation(aio({ url: "https://x.com/a" }), "x.com", [top[1]])).toMatchObject({ organic_rank: null, organic_checked: true });
  });

  it("caps other domains at 10", () => {
    const refs = Array.from({ length: 14 }, (_, i) => ({ domain: `d${i}.com`, url: `https://d${i}.com/` }));
    expect(parseCitation(aio(...refs), "x.com", []).other_domains).toHaveLength(10);
  });
});
