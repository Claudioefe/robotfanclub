import { describe, expect, it } from "vitest";
import { slackText } from "@/lib/cards";
import { buildSnippet, WEB_VITALS_VERSION } from "@/lib/snippet";

describe("Citation Card text", () => {
  it("builds the Slack message", () => {
    const text = slackText({
      clientName: "Northwind Security",
      query: "soc 2 cost for a 50 person company",
      url: "https://northwindsec.com/facts/pricing",
      position: 2,
      total: 4,
      organicRank: null,
      offTop10: true,
      firstSeen: "2026-11-02",
    });
    expect(text).toBe(
      [
        ":bookmark: Northwind Security was cited in Google’s AI answer",
        "Query: “soc 2 cost for a 50 person company”",
        "Source 2 of 4: northwindsec.com/facts/pricing",
        "Not in the organic top 10 (cited from outside the top 10)",
        "First seen: Nov 2, 2026",
      ].join("\n"),
    );
  });
});

describe("speed snippet", () => {
  it("pins web-vitals and carries the client id and endpoint", () => {
    const s = buildSnippet({ clientId: "00000000-0000-4000-8000-000000000001", endpoint: "https://x.test/api/ingest/vitals" });
    expect(s).toContain(`web-vitals@${WEB_VITALS_VERSION}/dist/web-vitals.attribution.js`);
    expect(s).toContain('const CLIENT_ID = "00000000-0000-4000-8000-000000000001"');
    expect(s).toContain('const ENDPOINT = "https://x.test/api/ingest/vitals"');
  });
  it("groups numeric and id-like path segments into a template", () => {
    const re = /\/(?:[0-9a-f-]{8,}|\d+)(?=\/|$)/gi;
    expect("/product/123/reviews".replace(re, "/*")).toBe("/product/*/reviews");
    expect("/blog/soc-2-timeline".replace(re, "/*")).toBe("/blog/soc-2-timeline");
  });
});
