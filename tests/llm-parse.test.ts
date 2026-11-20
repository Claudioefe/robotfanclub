// The ChatGPT parser on the REAL responses captured on 2026-11-18 and 2026-11-20 (D-046, D-048), plus synthetic edge cases.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDatetime, parseRun } from "../jobs/chatgpt/parse.ts";

const task = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/real/${name}`, import.meta.url), "utf8")).tasks[0];
const DOMAIN = "baumanrarebooks.com";

describe("parseRun on real ChatGPT responses", () => {
  it("cited: the client is among the sources, with its position, page and the other domains in order", () => {
    const r = parseRun(task("dfs-chatgpt-scraper-q15-where-to-sell-first-edition-books-real.json"), DOMAIN);
    expect(r).toMatchObject({ query: "where to sell first edition books", relation: "cited", clientSourceRank: 2, sourceCount: 9, costUsd: 0.004 });
    expect(r.clientUrl).toContain("baumanrarebooks.com/selling-something.aspx");
    expect(r.otherDomains[0]).toBe("manhattanrarebooks.com");
    expect(r.otherDomains).not.toContain("baumanrarebooks.com");
    expect(r.otherDomains.some((d) => d.startsWith("www."))).toBe(false);
    expect(r.runAt).toBe("2026-11-20T14:08:18.000Z");
    expect(r.runOn).toBe("2026-11-20");
  });

  it("consulted: ChatGPT read a client page but did not cite it, so there is no rank", () => {
    const r = parseRun(task("dfs-chatgpt-scraper-children-run1-real.json"), DOMAIN);
    expect(r).toMatchObject({ relation: "consulted", clientSourceRank: null });
    expect(r.clientUrl).toContain("baumanrarebooks.com/rare-books/children");
    expect(r.consultedCount).toBeGreaterThan(r.sourceCount);
  });

  it("none: the client is in neither the sources nor the pages read", () => {
    const r = parseRun(task("dfs-chatgpt-scraper-q15-books-worth-money-real.json"), DOMAIN);
    expect(r).toMatchObject({ relation: "none", clientSourceRank: null, clientUrl: null });
    expect(r.otherDomains.length).toBeGreaterThan(0);
  });

  it("agrees with what was counted by hand in D-046: 5 runs of 'children's books' give 1 cited and 2 consulted", () => {
    const relations = [1, 2, 3, 4, 5].map((n) => parseRun(task(`dfs-chatgpt-scraper-children-run${n}-real.json`), DOMAIN).relation);
    expect(relations.filter((r) => r === "cited")).toHaveLength(1);
    expect(relations.filter((r) => r === "consulted")).toHaveLength(2);
  });
});

describe("parseRun edge cases", () => {
  const base = { cost: 0.004, result: [{ keyword: "q", datetime: "2026-11-20 14:08:18 +00:00", sources: [] as { domain: string; url: string }[], search_results: [] as { domain: string; url: string }[] }] };

  it("matches subdomains of the client, but not look-alike domains", () => {
    const sub = structuredClone(base);
    sub.result[0].sources = [{ domain: "shop.baumanrarebooks.com", url: "https://shop.baumanrarebooks.com/x" }];
    expect(parseRun(sub, DOMAIN).relation).toBe("cited");
    const fake = structuredClone(base);
    fake.result[0].sources = [{ domain: "notbaumanrarebooks.com", url: "https://notbaumanrarebooks.com/" }];
    expect(parseRun(fake, DOMAIN).relation).toBe("none");
  });

  it("handles a response with no sources at all (ChatGPT answered without searching)", () => {
    const empty = { cost: 0.004, result: [{ keyword: "q", datetime: "2026-11-20 14:08:18 +00:00", sources: null, search_results: null }] };
    expect(parseRun(empty, DOMAIN)).toMatchObject({ relation: "none", sourceCount: 0, consultedCount: 0, otherDomains: [] });
  });

  it("does not repeat a domain that was cited twice, but still counts both sources", () => {
    const dup = structuredClone(base);
    dup.result[0].sources = [
      { domain: "www.nybooks.com", url: "https://www.nybooks.com/a" },
      { domain: "www.nybooks.com", url: "https://www.nybooks.com/b" },
    ];
    expect(parseRun(dup, DOMAIN)).toMatchObject({ sourceCount: 2, otherDomains: ["nybooks.com"] });
  });

  it("refuses a failed call: it is not a run and must not be stored", () => {
    expect(() => parseRun({ cost: 0, result: null }, DOMAIN)).toThrow("no result");
    expect(() => parseDatetime("yesterday")).toThrow("Unexpected datetime");
  });
});
