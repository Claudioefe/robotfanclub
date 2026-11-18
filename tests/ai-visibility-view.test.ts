import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMentions } from "../jobs/ai-visibility/parser.ts";
import { competitors, coverage, daysAgo, freshness, normalizeQuestion, queryIdeas, questionRows, type MentionView, type Platform, type RunView } from "@/lib/ai-visibility";

const real = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/real/${name}`, import.meta.url), "utf8")).tasks[0].result[0];
const view = (platform: Platform, file: string): MentionView[] =>
  parseMentions(real(file), "baumanrarebooks.com").rows.map((r) => ({
    platform,
    question: r.question,
    aiSearchVolume: r.ai_search_volume,
    firstResponseAt: r.first_response_at,
    lastResponseAt: r.last_response_at,
    relation: r.relation,
    sourceCount: r.source_count,
    clientSourceRank: r.client_source_rank,
    clientUrl: r.client_url,
    otherDomains: r.other_domains,
  }));
const google = view("google", "dfs-llm-mentions-bauman-google-40-real.json");
const chat = view("chat_gpt", "dfs-llm-mentions-bauman-chatgpt-40-real.json");
const all = [...google, ...chat];
const runs: RunView[] = [
  { platform: "google", capturedOn: "2026-11-18", totalCount: 1543, rowsStored: 40 },
  { platform: "chat_gpt", capturedOn: "2026-11-18", totalCount: 122, rowsStored: 40 },
  { platform: "chat_gpt", capturedOn: "2026-11-01", totalCount: 100, rowsStored: 40 },
];

describe("AI visibility view logic (on the real Bauman data)", () => {
  it("coverage uses the latest run per platform and counts cited and consulted apart", () => {
    const [g, c] = coverage(runs, all);
    expect(g).toMatchObject({ platform: "google", total: 1543, shown: 40, cited: 40, consulted: 0, capturedOn: "2026-11-18" });
    expect(c).toMatchObject({ platform: "chat_gpt", total: 122, shown: 40, cited: 17, consulted: 23 });
    expect(coverage([], [])[0]).toMatchObject({ total: 0, shown: 0, capturedOn: null });
  });

  it("folds case and punctuation only when matching questions", () => {
    expect(normalizeQuestion("What's the Rarest Dr. Seuss book?")).toBe("what s the rarest dr seuss book");
    expect(normalizeQuestion("what is the rarest dr. seuss book?")).not.toBe(normalizeQuestion("what's the rarest dr. seuss book?"));
  });

  it("one row per question, ordered by volume, with what each platform did", () => {
    const rows = questionRows(all);
    expect(rows[0]).toMatchObject({ question: "gifts for a book lover", volume: 27100 });
    expect(rows[0].platforms).toEqual([expect.objectContaining({ platform: "google", relation: "cited", rank: 6 })]);
    const volumes = rows.map((r) => r.volume ?? -1);
    expect(volumes).toEqual([...volumes].sort((a, b) => b - a));
    expect(rows.length).toBeLessThanOrEqual(80);
  });

  it("merges the same question asked on both platforms into one row", () => {
    const a: MentionView = { ...google[0], platform: "google", question: "Best CRM?" };
    const b: MentionView = { ...google[0], platform: "chat_gpt", question: "best crm", relation: "consulted", clientSourceRank: null, aiSearchVolume: 900 };
    const rows = questionRows([a, b]);
    expect(rows).toHaveLength(1);
    expect(rows[0].platforms.map((p) => p.platform).sort()).toEqual(["chat_gpt", "google"]);
    expect(rows[0].volume).toBe(Math.max(a.aiSearchVolume ?? 0, 900));
  });

  it("ranks competitors by the answers they appear in, never counting a domain twice in one answer", () => {
    const list = competitors(all);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c, i) => i === 0 || list[i - 1].answers >= c.answers)).toBe(true);
    expect(list.some((c) => c.domain.includes("baumanrarebooks"))).toBe(false);
    const dup: MentionView = { ...google[0], otherDomains: ["a.com", "a.com", "b.com"] };
    expect(competitors([dup])).toEqual([{ domain: "a.com", answers: 1 }, { domain: "b.com", answers: 1 }]);
    expect(competitors([{ ...google[0], otherDomains: ["google.com", "www.google.com", "a.com"] }])).toEqual([{ domain: "a.com", answers: 1 }]); // Google's own links are not sources
    expect(competitors(all)[0].domain).toBe("en.wikipedia.org"); // the most cited alongside Bauman are reference sites
  });

  it("says how old the recorded answers are: they are not from the capture day", () => {
    const f = freshness(google);
    expect(f.newest).toBe("2026-11-14T21:08:53.000Z");
    expect(f.oldest).toBe("2025-08-26T06:54:27.000Z");
    expect(f.monthsSpread).toBeGreaterThanOrEqual(12);
    expect(freshness([])).toEqual({ newest: null, oldest: null, monthsSpread: 0 });
    expect(daysAgo("2026-11-14T21:08:53.000Z", "2026-11-18")).toBe(4);
    expect(daysAgo("2026-12-01T00:00:00.000Z", "2026-11-18")).toBe(0);
  });

  it("suggests only questions Google's AI already cites the client for, skipping what is frozen", () => {
    const ideas = queryIdeas(all, ["Gifts for a book lover?"], 5);
    expect(ideas).toHaveLength(5);
    expect(ideas.map((i) => normalizeQuestion(i.query))).not.toContain("gifts for a book lover");
    expect(ideas[0].volume).toBe(22200); // the next-highest after the frozen one
    const chatOnly = queryIdeas(chat, []);
    expect(chatOnly).toEqual([]); // ChatGPT questions are no evidence for a Google SLA list
  });
});
