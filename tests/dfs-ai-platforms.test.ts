// Canaries on REAL DataForSEO responses from the other AI platforms (captured 2026-11-18, see D-039).
// They pin down what these products returned for the experiment. If DataForSEO changes any of it (for example Gemini
// starts returning sources), they fail on purpose: revisit D-039 before building on it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/real/${name}`, import.meta.url), "utf8"));
const firstResult = (name: string) => load(name).tasks[0].result[0];
const domains = (list: { domain: string }[] | null) => (list ?? []).map((s) => s.domain);

describe("ChatGPT LLM Scraper", () => {
  it("without force_web_search there is nothing to measure: no sources, no consulted pages, no brands", () => {
    const r = firstResult("dfs-chatgpt-scraper-default-real.json");
    expect(r.model).toEqual(expect.any(String));
    expect(r.sources).toBeNull();
    expect(r.search_results).toBeNull();
    expect(r.brand_entities).toBeNull();
    expect(r.fan_out_queries).toBeNull();
    expect(r.item_types).toContain("chat_gpt_text");
  });

  it("with force_web_search it returns the sources it cited, every page it consulted, and its fan-out queries", () => {
    const r = firstResult("dfs-chatgpt-scraper-web-search-real.json");
    expect(r.sources.length).toBeGreaterThanOrEqual(1);
    for (const s of r.sources) expect(s).toMatchObject({ type: "chat_gpt_source", domain: expect.any(String), url: expect.stringMatching(/^https?:\/\//) });
    expect(r.search_results.length).toBeGreaterThan(r.sources.length); // it consulted more than it cited
    expect(Array.isArray(r.fan_out_queries)).toBe(true);
    expect(domains(r.sources)).toEqual(expect.arrayContaining(["www.abaa.org", "ilab.org"]));
    expect(JSON.stringify(r).includes("baumanrarebooks")).toBe(false); // the client was not cited
  });

  it("costs USD 0.004 per live call", () => {
    expect(load("dfs-chatgpt-scraper-web-search-real.json").tasks[0].cost).toBe(0.004);
  });
});

describe("Gemini LLM Scraper", () => {
  it("returned no sources, and the endpoint has no way to force a web search", () => {
    const r = firstResult("dfs-gemini-scraper-real.json");
    expect(r.sources).toBeNull();
    expect(r.item_types).toEqual(["gemini_text"]);
    expect(load("dfs-gemini-scraper-real.json").tasks[0].data).not.toHaveProperty("force_web_search");
  });
});

describe("LLM Mentions for a client's domain", () => {
  const body = load("dfs-llm-mentions-bauman-real.json");
  const result = body.tasks[0].result[0];

  it("answers instantly and reports how many AI answers mention the domain", () => {
    expect(result.total_count).toBeGreaterThan(1000);
    expect(result.items_count).toBe(result.items.length);
    expect(Number.parseFloat(body.tasks[0].time)).toBeLessThan(5);
  });

  it("each mention carries the question, the AI search volume, the sources and when it was recorded", () => {
    for (const m of result.items) {
      expect(m).toMatchObject({ platform: expect.stringMatching(/^(google|chat_gpt)$/), question: expect.any(String), ai_search_volume: expect.any(Number) });
      expect(domains(m.sources)).toContain("www.baumanrarebooks.com");
      expect(m.first_response_at).toBeTruthy();
      expect(m.last_response_at).toBeTruthy();
    }
  });

  it("is a snapshot of a database, not a live measurement: some mentions were last recorded months ago", () => {
    const lastSeen = result.items.map((m: { last_response_at: string }) => Date.parse(m.last_response_at));
    const oldest = Math.min(...lastSeen);
    const newest = Math.max(...lastSeen);
    expect(newest - oldest).toBeGreaterThan(90 * 864e5); // the sample spans more than three months of freshness
  });

  it("costs USD 0.1 per request plus USD 0.001 per row", () => {
    expect(body.tasks[0].cost).toBeCloseTo(0.1 + 0.001 * result.items_count, 5);
  });
});

describe("ChatGPT repeated runs (gifts for a book lover, search forced)", () => {
  const runs = [1, 2, 3, 4, 5].map((n) => firstResult(`dfs-chatgpt-scraper-gifts-run${n}-real.json`));

  it("the client was cited in none of the 5 runs, even though Google AI Overview cites it for this query", () => {
    for (const r of runs) expect(JSON.stringify(r).toLowerCase().includes("bauman")).toBe(false);
  });

  it("every run returns sources and consulted pages, so an appearance rate over N runs is computable", () => {
    for (const r of runs) {
      expect(r.sources.length).toBeGreaterThanOrEqual(1);
      expect(r.search_results.length).toBeGreaterThan(0);
    }
  });

  it("the cited sources differ between runs: one run is not evidence", () => {
    const sets = runs.map((r) => new Set(domains(r.sources)));
    const distinct = new Set(sets.map((s) => [...s].sort().join(",")));
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe("LLM Mentions on the chat_gpt platform", () => {
  const body = load("dfs-llm-mentions-bauman-chatgpt-real.json");
  const result = body.tasks[0].result[0];

  it("reports far fewer ChatGPT answers than Google AI Overview for the same domain, about other topics", () => {
    expect(result.total_count).toBeGreaterThan(50);
    expect(result.total_count).toBeLessThan(load("dfs-llm-mentions-bauman-real.json").tasks[0].result[0].total_count);
    for (const m of result.items) expect(m.platform).toBe("chat_gpt");
  });

  it("keeps no pagination token (it embeds an account id)", () => {
    expect(result.search_after_token).toBe("REDACTED");
  });
});
