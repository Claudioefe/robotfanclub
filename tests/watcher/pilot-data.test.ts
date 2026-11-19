// The parser against the first REAL daily run of the pilot (Bauman Rare Books, 15 queries, 2026-11-19, US, English, mobile).
// These are the raw snapshots the watcher stored as evidence. See D-043 for what the day showed.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normUrl, organicTop10, parseCitation, type DfsResult } from "../../jobs/watcher/parser.ts";

const DIR = new URL("../fixtures/real/watcher-bauman-pilot-2026-11-19/", import.meta.url);
const CLIENT = "baumanrarebooks.com";
const load = (surface: string, query: string): DfsResult => {
  const file = readdirSync(DIR).find((f) => f.startsWith(`${surface}-${query.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-`));
  if (!file) throw new Error(`no snapshot for ${surface} / ${query}`);
  return JSON.parse(readFileSync(new URL(file, DIR), "utf8"));
};
// The AI Mode check is compared against the organic top 10 of the same query (the watcher takes it from the AI Overview call).
const parse = (surface: "ai_overview" | "ai_mode", query: string) => parseCitation(load(surface, query), CLIENT, organicTop10(load("ai_overview", query)));

describe("pilot day 1: what the real responses said", () => {
  it("cites Bauman from a page that is not in the US mobile top 10, even though Search Console averages position 3.6 worldwide", () => {
    const c = parse("ai_overview", "books worth money");
    expect(c).toMatchObject({ aio_present: true, cited: true, source_position: 2, source_count: 10, organic_rank: null, organic_checked: true });
    expect(c.cited_url).toBe("https://www.baumanrarebooks.com/rare-books/literature/modern-literature/");
    const top10 = organicTop10(load("ai_overview", "books worth money"))!;
    expect(top10.some((i) => String(i.domain).includes("baumanrarebooks"))).toBe(false);
  });

  it("compares by URL, not by domain: the home page ranks 3rd organically and AI Mode cites another Bauman page", () => {
    const top10 = organicTop10(load("ai_overview", "rare books for sale"))!;
    const home = top10.find((i) => String(i.domain).includes("baumanrarebooks"))!;
    expect(home.rank_group).toBe(3);
    const c = parse("ai_mode", "rare books for sale");
    expect(c).toMatchObject({ cited: true, source_position: 1, source_count: 3, organic_rank: null });
    expect(normUrl(c.cited_url)).not.toBe(normUrl(home.url));
  });

  it("some queries have no AI Overview at all, and still have an AI Mode answer", () => {
    expect(parse("ai_overview", "rare books for sale")).toMatchObject({ aio_present: false, cited: false });
    expect(parse("ai_mode", "rare books for sale").aio_present).toBe(true);
  });

  it("shows that the LLM Mentions database is a snapshot: 'gifts for a book lover' is not cited today", () => {
    expect(parse("ai_overview", "gifts for a book lover")).toMatchObject({ aio_present: true, cited: false });
    expect(parse("ai_mode", "gifts for a book lover").cited).toBe(false);
  });

  it("adds up to 11 of 15 queries cited, 13 cited checks out of 27 with an AI answer", () => {
    const queries = [...new Set(readdirSync(DIR).map((f) => (JSON.parse(readFileSync(new URL(f, DIR), "utf8")) as { keyword: string }).keyword))];
    expect(queries).toHaveLength(15);
    let citedQueries = 0, checksWithAi = 0, checksCited = 0;
    for (const q of queries) {
      const checks = (["ai_overview", "ai_mode"] as const).map((s) => parse(s, q));
      if (checks.some((c) => c.cited)) citedQueries++;
      for (const c of checks) if (c.aio_present) { checksWithAi++; if (c.cited) checksCited++; }
    }
    expect({ citedQueries, checksWithAi, checksCited }).toEqual({ citedQueries: 11, checksWithAi: 27, checksCited: 13 });
  });
});
