// Canaries on REAL ChatGPT LLM Scraper responses for the pilot's frozen queries (captured 2026-11-20, one run each, web search
// forced, US/English, see D-046). One run is not evidence of a rate; these tests pin what was captured so that a later change
// in the parser, or in what DataForSEO returns, shows up on purpose.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = new URL("./fixtures/real/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.startsWith("dfs-chatgpt-scraper-q15-"));
const results = files.map((f) => ({ f, r: JSON.parse(readFileSync(new URL(f, dir), "utf8")).tasks[0].result[0] }));
const host = (s: { domain?: string }) => (s.domain ?? "").replace(/^www\./, "");

describe("ChatGPT on 13 of the pilot's 15 frozen queries (one run each)", () => {
  it("has a capture for each of the 13 queries and every one returned sources and consulted pages", () => {
    expect(results).toHaveLength(13);
    for (const { r } of results) {
      expect(r.sources.length).toBeGreaterThanOrEqual(1);
      expect(r.search_results.length).toBeGreaterThan(0);
    }
  });

  it("cited the client in one query only: 'where to sell first edition books', position 2 of 9", () => {
    const cited = results.filter(({ r }) => r.sources.some((s: { domain: string }) => /bauman/.test(s.domain)));
    expect(cited.map((c) => c.f)).toEqual(["dfs-chatgpt-scraper-q15-where-to-sell-first-edition-books-real.json"]);
    const sources = cited[0].r.sources;
    expect(sources).toHaveLength(9);
    expect(sources.findIndex((s: { domain: string }) => /bauman/.test(s.domain)) + 1).toBe(2);
  });

  it("consulted a client page without citing it in 3 queries (cited and consulted are different things)", () => {
    const consulted = results.filter(({ r }) => (r.search_results as { domain?: string; url?: string }[]).some((s) => /bauman/.test(`${s.domain ?? ""}${s.url ?? ""}`)));
    expect(consulted).toHaveLength(3);
  });

  it("the sites ChatGPT prefers repeat across queries: Sotheby's, MyVolumes and AbeBooks each show up in 6 of 13", () => {
    const count = (d: string) => results.filter(({ r }) => r.sources.some((s: { domain?: string }) => host(s) === d)).length;
    for (const d of ["sothebys.com", "myvolumes.com", "abebooks.com"]) expect(count(d)).toBe(6);
  });

  it("each call cost USD 0.004", () => {
    for (const f of files) expect(JSON.parse(readFileSync(new URL(f, dir), "utf8")).tasks[0].cost).toBe(0.004);
  });
});
