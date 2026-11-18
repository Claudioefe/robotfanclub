// Parser against REAL DataForSEO responses captured on 2026-11-18 (tests/fixtures/real).
// Query: "how to tell if a book is a first edition", US, English, mobile. See D-033 for what these showed.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectRefs, normUrl, organicTop10, parseCitation, type DfsResult } from "../../jobs/watcher/parser.ts";

const load = (name: string): DfsResult => JSON.parse(readFileSync(new URL(`../fixtures/real/${name}`, import.meta.url), "utf8")).tasks[0].result[0];
const organic = load("dfs-organic-mobile-unresolved-real.json"); // captured WITHOUT resolve_goto_urls
const resolved = load("dfs-organic-mobile-resolved-real.json"); // captured WITH resolve_goto_urls: true
const aiMode = load("dfs-ai-mode-mobile-real.json");

describe("real SERP with AI Overview (mobile)", () => {
  const aio = organic.items!.find((i) => i.type === "ai_overview")!;

  it("finds the AI Overview and dedupes its references by URL (26 mentions, 10 pages)", () => {
    expect(collectRefs(aio)).toHaveLength(26);
    const c = parseCitation(organic, "abebooks.com", organicTop10(organic));
    expect(c).toMatchObject({ aio_present: true, cited: true, source_position: 6, source_count: 10 });
    expect(c.other_domains).toContain("biblio.com");
  });

  it("does not cite a client that is absent, and lists who was cited instead", () => {
    const c = parseCitation(organic, "baumanrarebooks.com", organicTop10(organic));
    expect(c).toMatchObject({ aio_present: true, cited: false, cited_url: null, source_count: 10 });
    expect(c.other_domains).toEqual(expect.arrayContaining(["youtube.com", "abebooks.com", "reddit.com"]));
  });
});

// CANARIES. These pin down what real mobile data looks like today. If DataForSEO or Google change it,
// they fail on purpose: revisit D-033 (off-top10 needs real destination URLs).
describe("canary: mobile organic results are Google redirect links (D-033)", () => {
  const items = organic.items!.filter((i) => i.type === "organic");

  it("organic urls are google.com/goto redirects and the domain field is google.com", () => {
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      expect(i.url).toMatch(/^https:\/\/google\.com\/goto\?url=/);
      expect(i.domain).toBe("google.com");
    }
  });

  it("therefore the organic rank of a cited page cannot be found by URL, and must be reported as UNKNOWN, not 'off the top 10'", () => {
    expect(organicTop10(organic)!.every((o) => normUrl(o.url)?.startsWith("google.com/goto"))).toBe(true);
    const c = parseCitation(organic, "abebooks.com", organicTop10(organic));
    expect(c.organic_rank).toBeNull();
    expect(c.organic_checked).toBe(false); // unresolved redirects in the top 10: no claim about the rank (D-033)
  });

  it("the real site of a result survives only as the breadcrumb host (not the page)", () => {
    expect(items.map((i) => i.breadcrumb)).toContain("https://www.reddit.com");
  });

  it("one AI Overview reference is itself a redirect: its site is invisible to client matching", () => {
    const c = parseCitation(organic, "abebooks.com", organicTop10(organic));
    expect(c.unresolved_refs).toBe(refsBehindRedirects());
    const hidden = collectRefs(aio_of(organic)).find((r) => String(r.url).includes("google.com/goto"));
    expect(hidden).toMatchObject({ domain: "google.com", source: "Quill & Brush" });
    expect(parseCitation(organic, "quillandbrush.com", organicTop10(organic)).cited).toBe(false);
  });
});

function refsBehindRedirects() {
  return new Set(collectRefs(aio_of(organic)).map((r) => String(r.url)).filter((u) => u.includes("google.com/goto"))).size;
}

function aio_of(result: DfsResult) {
  return result.items!.find((i) => i.type === "ai_overview");
}

describe("real AI Mode response (mobile, trimmed fixture)", () => {
  it("dedupes repeated references: one page cited many times counts once", () => {
    const c = parseCitation(aiMode, "abebooks.com", organicTop10(organic));
    expect(c).toMatchObject({ aio_present: true, cited: true, source_position: 1, source_count: 1, cited_url: expect.stringContaining("collecting-first-editions") });
  });

  it("does not cite an absent client", () => {
    expect(parseCitation(aiMode, "baumanrarebooks.com", organicTop10(organic))).toMatchObject({ aio_present: true, cited: false, source_count: 1 });
  });

  it("has the same ai_overview type and nested references as the SERP, as the docs say", () => {
    expect(aiMode.items!.map((i) => i.type)).toEqual(["ai_overview"]);
    expect(collectRefs(aiMode).every((r) => r.type === "ai_overview_reference")).toBe(true);
  });
});

// Same query, captured with resolve_goto_urls: true. This is what the watcher sends (D-034).
describe("real SERP with resolve_goto_urls (mobile)", () => {
  const top10 = organicTop10(resolved);

  it("every organic result and every AI Overview reference carries its real URL", () => {
    const aio = resolved.items!.find((i) => i.type === "ai_overview")!;
    expect(top10).toHaveLength(8);
    expect(top10!.every((o) => !String(o.url).includes("google.com/goto") && o.domain !== "google.com")).toBe(true);
    expect(collectRefs(aio).every((r) => !String(r.url).includes("google.com/goto"))).toBe(true);
  });

  it("the reference that used to hide behind a redirect is now attributable: Quill & Brush is qbbooks.com", () => {
    const c = parseCitation(resolved, "qbbooks.com", top10);
    expect(c).toMatchObject({ aio_present: true, cited: true, cited_url: "https://www.qbbooks.com/first_ed_pub.php", source_position: 8, source_count: 10, unresolved_refs: 0 });
  });

  it("judges off-top10 by URL for real: AbeBooks is cited but is not one of the top results", () => {
    const c = parseCitation(resolved, "abebooks.com", top10);
    expect(c).toMatchObject({ cited: true, organic_rank: null, organic_checked: true }); // known, and outside the top 10
  });

  it("finds a cited page inside the top 10 when it ranks there (a synthetic client on a real result)", () => {
    // YouTube is both cited (reference 1) and ranks organically (rank 7 on a different video): same domain, different URL.
    const c = parseCitation(resolved, "youtube.com", top10);
    expect(c).toMatchObject({ cited: true, cited_url: "https://www.youtube.com/watch?v=cOHGtC8piyk", organic_rank: null, organic_checked: true });
  });

  it("has no unresolved references", () => {
    expect(parseCitation(resolved, "baumanrarebooks.com", top10)).toMatchObject({ cited: false, unresolved_refs: 0, organic_checked: true });
  });
});
