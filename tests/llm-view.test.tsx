import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunDots, RunDotsLegend } from "@/components/citations/RunDots";
import { buildLlmView, type LlmRunRow } from "../src/lib/data/llm.ts";

const run = (query: string, relation: LlmRunRow["relation"], at: string, others: string[] = [], rank: number | null = null): LlmRunRow => ({
  query,
  runAt: `${at}T14:00:00.000Z`,
  runOn: at,
  relation,
  sourceCount: others.length + (relation === "cited" ? 1 : 0),
  clientSourceRank: rank,
  clientUrl: null,
  otherDomains: others,
  consultedCount: 10,
  snapshotPath: `c/${at}/${query}-${relation}.json`,
});

describe("buildLlmView", () => {
  const runs: LlmRunRow[] = [
    run("b", "cited", "2026-11-20", ["x.com", "y.com"], 2),
    run("b", "none", "2026-11-18", ["x.com"]),
    run("b", "consulted", "2026-11-19", ["x.com", "z.com"]),
    run("c", "consulted", "2026-11-20", ["y.com"]),
    run("d", "none", "2026-11-20", ["x.com"]),
    run("extra", "cited", "2026-11-20", ["x.com"], 1),
  ];
  const view = buildLlmView(runs, ["a", "b", "c", "d"]);

  it("lists the frozen queries first, in their order, then the extra queries; a frozen query with no runs stays in the list", () => {
    expect(view.rows.map((r) => [r.query, r.frozen, r.runs.length])).toEqual([["a", true, 0], ["b", true, 3], ["c", true, 1], ["d", true, 1], ["extra", false, 1]]);
  });

  it("orders the runs of a query oldest first, so the dots read left to right", () => {
    expect(view.rows[1].runs.map((r) => r.relation)).toEqual(["none", "consulted", "cited"]);
    expect(view.rows[1]).toMatchObject({ cited: 1, consulted: 1, none: 1, lastRunOn: "2026-11-20" });
  });

  it("totals only count the frozen queries that were measured, and keep cited apart from consulted", () => {
    expect(view.totals).toEqual({ frozenQueries: 4, measuredQueries: 3, queriesCited: 1, queriesConsultedOnly: 1, runs: 5, runsCited: 1, runsConsulted: 2 });
  });

  it("ranks the sites ChatGPT cites by how many queries they appeared in, not by how many runs", () => {
    expect(view.preferred[0]).toEqual({ domain: "x.com", queries: 2 }); // b (in 3 runs) and d: counted once per query, not once per run
    expect(view.preferred.find((p) => p.domain === "y.com")).toEqual({ domain: "y.com", queries: 2 });
    expect(view.preferred.some((p) => p.domain === "extra")).toBe(false);
  });

  it("per query, lists the most frequent other domains first", () => {
    expect(view.rows[1].topOthers[0]).toEqual({ domain: "x.com", runs: 3 });
  });

  it("an empty set of runs gives empty totals instead of failing", () => {
    expect(buildLlmView([], ["a"]).totals).toMatchObject({ measuredQueries: 0, runs: 0, queriesCited: 0 });
  });
});

describe("run dots", () => {
  const rows = [run("q", "none", "2026-11-18"), run("q", "consulted", "2026-11-19"), run("q", "cited", "2026-11-20", ["x.com"], 1)];
  const html = renderToStaticMarkup(<RunDots runs={rows} summary="1 of 3 runs cited, 1 consulted only" />);

  it("draws one cell per run with a plain-language tooltip, and one summary for screen readers", () => {
    expect(html.match(/<i /g)).toHaveLength(3);
    expect(html).toContain("Nov 20, 2026 · Cited (source 1 of 2)");
    expect(html).toContain("Nov 19, 2026 · Consulted, not cited");
    expect(html).toContain("Nov 18, 2026 · Not mentioned");
    expect(html).toContain('aria-label="1 of 3 runs cited, 1 consulted only"');
  });

  it("says so when there are no runs, and the legend names the three states", () => {
    expect(renderToStaticMarkup(<RunDots runs={[]} summary="" />)).toContain("No runs yet");
    const legend = renderToStaticMarkup(<RunDotsLegend />);
    for (const t of ["Cited", "Consulted, not cited", "Not mentioned"]) expect(legend).toContain(t);
  });
});
