import { describe, expect, it } from "vitest";
import { buildHistory, checkState, combine, daysBetween, type CheckRow } from "../src/lib/data/history.ts";

const row = (query: string, surface: CheckRow["surface"], day: string, state: "cited" | "gap" | "no_ai"): CheckRow => ({
  query,
  surface,
  checked_on: day,
  aio_present: state !== "no_ai",
  cited: state === "cited",
});

describe("day states", () => {
  it("tells a lost citation (gap) from a day with no AI answer", () => {
    expect(checkState({ aio_present: true, cited: false })).toBe("gap");
    expect(checkState({ aio_present: false, cited: false })).toBe("no_ai");
    expect(checkState({ aio_present: true, cited: true })).toBe("cited");
    expect(checkState(undefined)).toBe("unchecked");
  });

  it("combines surfaces: cited beats a gap, a gap beats no AI answer, no check at all stays unchecked", () => {
    expect(combine(["no_ai", "cited"])).toBe("cited");
    expect(combine(["gap", "no_ai"])).toBe("gap");
    expect(combine(["no_ai", "unchecked"])).toBe("no_ai");
    expect(combine(["unchecked", "unchecked"])).toBe("unchecked");
  });

  it("lists days inclusively and across month ends", () => {
    expect(daysBetween("2026-11-29", "2026-12-02")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
  });
});

describe("buildHistory", () => {
  const base = { frozenFrom: "2026-11-19", frozenUntil: "2027-01-17", queries: ["a", "b"] };

  it("shows only the days that already happened, and marks a missing day as unchecked", () => {
    const h = buildHistory({
      ...base,
      today: "2026-11-21",
      checks: [row("a", "ai_overview", "2026-11-19", "cited"), row("a", "ai_overview", "2026-11-21", "gap")],
    });
    expect(h.days).toEqual(["2026-11-19", "2026-11-20", "2026-11-21"]);
    expect(h.queries[0].surfaces.ai_overview).toEqual(["cited", "unchecked", "gap"]);
    expect(h.queries[0].surfaces.ai_mode).toEqual(["unchecked", "unchecked", "unchecked"]);
  });

  it("stops at the window end", () => {
    const h = buildHistory({ ...base, today: "2027-03-01", checks: [] });
    expect(h.days).toHaveLength(60);
    expect(h.days.at(-1)).toBe("2027-01-17");
  });

  it("counts days cited out of days with an AI answer, and leaves no-AI days out of the base", () => {
    const h = buildHistory({
      ...base,
      today: "2026-11-22",
      checks: [
        row("a", "ai_overview", "2026-11-19", "cited"),
        row("a", "ai_overview", "2026-11-20", "no_ai"),
        row("a", "ai_overview", "2026-11-21", "gap"),
        row("a", "ai_mode", "2026-11-21", "cited"),
        row("a", "ai_overview", "2026-11-22", "cited"),
      ],
    });
    const a = h.queries[0];
    expect(a.combined).toEqual(["cited", "no_ai", "cited", "cited"]); // AI Mode cited on the 21st beats the AI Overview gap
    expect(a.daysCited).toBe(3);
    expect(a.daysWithAi).toBe(3);
    expect(a.daysChecked).toBe(4);
  });

  it("builds the SLA line: cumulative never goes down, the daily count can", () => {
    const h = buildHistory({
      ...base,
      today: "2026-11-21",
      checks: [
        row("a", "ai_overview", "2026-11-19", "cited"),
        row("b", "ai_overview", "2026-11-19", "gap"),
        row("a", "ai_overview", "2026-11-20", "gap"), // a loses its citation that day
        row("b", "ai_overview", "2026-11-20", "cited"),
        row("a", "ai_overview", "2026-11-21", "cited"), // a is cited again: it must not count twice
        row("b", "ai_overview", "2026-11-21", "cited"),
      ],
    });
    expect(h.daily.map((d) => d.citedThatDay)).toEqual([1, 1, 2]);
    expect(h.daily.map((d) => d.cumulative)).toEqual([1, 2, 2]);
  });

  it("flags a day with no stored check at all, so the chart leaves a gap instead of a flat line", () => {
    const h = buildHistory({ ...base, today: "2026-11-21", checks: [row("a", "ai_overview", "2026-11-19", "cited"), row("a", "ai_overview", "2026-11-21", "cited")] });
    expect(h.daily.map((d) => d.checked)).toEqual([true, false, true]);
  });

  it("ignores checks outside the window and for queries that are not in the frozen list", () => {
    const h = buildHistory({
      ...base,
      today: "2026-11-20",
      checks: [row("a", "ai_overview", "2026-11-18", "cited"), row("zzz", "ai_overview", "2026-11-19", "cited"), row("b", "ai_overview", "2026-11-20", "gap")],
    });
    expect(h.daily.at(-1)?.cumulative).toBe(0);
    expect(h.queries.map((q) => q.query)).toEqual(["a", "b"]);
    expect(h.queries[1].combined).toEqual(["unchecked", "gap"]);
  });

  it("keeps the cited check when a day has two rows for the same surface", () => {
    const h = buildHistory({
      ...base,
      today: "2026-11-19",
      checks: [row("a", "ai_overview", "2026-11-19", "gap"), row("a", "ai_overview", "2026-11-19", "cited")],
    });
    expect(h.queries[0].combined).toEqual(["cited"]);
  });

  it("returns an empty history before the window starts", () => {
    const h = buildHistory({ ...base, today: "2026-11-01", checks: [] });
    expect(h.days).toEqual([]);
    expect(h.daily).toEqual([]);
  });
});
