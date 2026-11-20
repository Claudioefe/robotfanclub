import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CitationsChart } from "@/components/citations/CitationsChart";
import { Strip, StripLegend } from "@/components/citations/Strip";
import type { DayPoint, DayState } from "@/lib/portal/data";

const days = ["2026-11-19", "2026-11-20", "2026-11-21"];
const states: Record<"ai_overview" | "ai_mode", DayState[]> = {
  ai_overview: ["cited", "gap", "no_ai"],
  ai_mode: ["unchecked", "cited", "cited"],
};

describe("day strip", () => {
  const html = renderToStaticMarkup(<Strip days={days} surfaces={states} summary="AI Overview: cited 1 of 2 days" />);

  it("draws one cell per day and surface, each with a plain-language tooltip", () => {
    expect(html.match(/<i /g)).toHaveLength(6);
    expect(html).toContain("Nov 19, 2026 · AIO · Cited");
    expect(html).toContain("Nov 20, 2026 · AIO · AI answer without us");
    expect(html).toContain("Nov 21, 2026 · AIO · No AI answer");
    expect(html).toContain("Nov 19, 2026 · AI Mode · Not checked");
  });

  it("gives screen readers one summary instead of 120 cells", () => {
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="AI Overview: cited 1 of 2 days"');
  });

  it("on a phone shows only the last 14 days", () => {
    const sixty = Array.from({ length: 60 }, (_, i) => `2026-12-${String((i % 28) + 1).padStart(2, "0")}-${i}`);
    const many = renderToStaticMarkup(<Strip days={sixty} surfaces={{ ai_overview: sixty.map(() => "cited"), ai_mode: sixty.map(() => "gap") }} summary="x" />);
    expect(many.match(/max-md:hidden/g)).toHaveLength((60 - 14) * 2);
  });

  it("the legend names the four states", () => {
    const legend = renderToStaticMarkup(<StripLegend />);
    for (const text of ["Cited", "AI answer without us", "No AI answer", "Not checked"]) expect(legend).toContain(text);
  });
});

describe("citations chart", () => {
  const daily: DayPoint[] = [
    { day: "2026-11-19", checked: true, citedThatDay: 11, cumulative: 11 },
    { day: "2026-11-20", checked: true, citedThatDay: 9, cumulative: 13 },
  ];
  const html = renderToStaticMarkup(<CitationsChart daily={daily} />);

  it("marks the SLA floor, target and bonus", () => {
    for (const text of ["12 floor", "18 target", "25 bonus"]) expect(html).toContain(text);
  });

  it("describes the SLA count in words for screen readers", () => {
    expect(html).toContain("13 queries cited at least once");
    expect(html).toContain("9 cited on the last day");
  });

  it("draws the cumulative line and one bar per day with citations", () => {
    expect(html).toContain("<path");
    expect(html.match(/<rect /g)).toHaveLength(2);
  });

  it("draws nothing for a day with no checks and stops the line at the last checked day", () => {
    const withGap: DayPoint[] = [...daily, { day: "2026-11-21", checked: false, citedThatDay: 0, cumulative: 13 }];
    const gap = renderToStaticMarkup(<CitationsChart daily={withGap} />);
    expect(gap).toContain("After day 2:"); // not day 3
    expect(gap.match(/<circle /g)).toHaveLength(1);
  });

  it("renders with no data instead of failing", () => {
    expect(renderToStaticMarkup(<CitationsChart daily={[]} />)).toContain("No checks stored yet.");
  });
});
