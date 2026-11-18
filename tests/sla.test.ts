import { describe, expect, it } from "vitest";
import {
  addDays,
  citationRate,
  cruxWindows,
  projectCitations,
  rulerPct,
  share,
  slaStatus,
  tagEstimate,
  windowDay,
  windowEnd,
} from "@/lib/sla";

// Numbers come from prototype/portal-mvp.html: window from 2026-10-11, demo "today" 2026-11-17.
describe("window", () => {
  it("counts the day inside the 60-day window", () => {
    expect(windowDay("2026-10-11", "2026-11-17")).toBe(38);
    expect(windowDay("2026-10-11", "2026-10-11")).toBe(1);
    expect(windowDay("2026-10-11", "2027-03-01")).toBe(60); // capped
    expect(windowEnd("2026-10-11")).toBe("2026-12-09");
  });
  it("adds days across months", () => {
    expect(addDays("2026-10-26", 29)).toBe("2026-11-24");
  });
});

describe("projection and status (prototype demo: 13 citations on day 38)", () => {
  it("projects linearly to day 60", () => {
    expect(projectCitations(13, 38)).toBe(21);
  });
  it("is on pace for the target", () => {
    expect(slaStatus({ cited: 13, day: 38 })).toEqual({
      tone: "good",
      text: "On pace for the target of 18. The bonus needs 12 more in 22 days.",
    });
  });
  it("is on pace for the bonus at 25 projected", () => {
    expect(slaStatus({ cited: 17, day: 38 }).text).toBe("On pace for the bonus at 25.");
  });
  it("reports a met floor below the target pace", () => {
    expect(slaStatus({ cited: 12, day: 50 })).toEqual({
      tone: "neutral",
      text: "SLA floor of 12 already met. The target of 18 needs 6 more in 10 days.",
    });
  });
  it("is on pace for the floor only", () => {
    expect(slaStatus({ cited: 8, day: 30 })).toEqual({
      tone: "neutral",
      text: "On pace to clear the SLA floor of 12, not the target of 18. 4 more needed for the floor in 30 days.",
    });
  });
  it("does not project, or warn about a clawback, during the first week", () => {
    expect(slaStatus({ cited: 0, day: 1, feeUsd: 14500 })).toEqual({ tone: "neutral", text: "Day 1 of 60: too early to project. 0 citations so far." });
    expect(slaStatus({ cited: 1, day: 6 }).text).toBe("Day 6 of 60: too early to project. 1 citation so far.");
    // From day 7 the usual rules apply
    expect(slaStatus({ cited: 0, day: 7 }).tone).toBe("bad");
    // An already met floor is still reported in the first week
    expect(slaStatus({ cited: 12, day: 3 })).toEqual({ tone: "good", text: "SLA floor of 12 already met on day 3." });
  });
  it("warns about the clawback credit with the fee", () => {
    expect(slaStatus({ cited: 4, day: 30, feeUsd: 14500 })).toEqual({
      tone: "bad",
      text: "Clawback risk: projected below 12. A 20% credit ($2,900) would apply.",
    });
    expect(slaStatus({ cited: 4, day: 30 }).text).toContain("20% fee credit");
  });
});

describe("shares and ruler", () => {
  it("computes the off-top10 share", () => {
    expect(Math.round(share(6, 13) * 100)).toBe(46);
    expect(share(0, 0)).toBe(0);
  });
  it("places marks on the 0 to 30 ruler", () => {
    expect(rulerPct(12)).toBe(40);
    expect(rulerPct(45)).toBe(100);
  });
  it("computes the citation rate", () => {
    expect(citationRate(3, 4)).toBe(0.75);
    expect(citationRate(0, 0)).toBe(0);
  });
});

describe("CrUX windows (sprint deployed 2026-10-26)", () => {
  it("starts the day after the deploy and tracks collected days", () => {
    const [w1, w2] = cruxWindows("2026-10-26", "2026-11-17");
    expect(w1).toMatchObject({ start: "2026-10-27", end: "2026-11-23", daysCollected: 22, state: "collecting" });
    expect(w2).toMatchObject({ start: "2026-11-24", end: "2026-12-21", daysCollected: 0, state: "not_started" });
  });
  it("closes a finished window", () => {
    expect(cruxWindows("2026-10-26", "2026-12-30")[0]).toMatchObject({ daysCollected: 28, state: "closed" });
  });
});

describe("Tag Bouncer estimate (prototype defaults)", () => {
  it("saves about 72 ms from 214", () => {
    const scripts = [
      { blockingMs: 62, action: "load_on_first_interaction" as const },
      { blockingMs: 48, action: "remove" as const },
      { blockingMs: 41, action: "move_server_side" as const },
      { blockingMs: 35, action: "keep" as const },
      { blockingMs: 29, action: "keep" as const },
      { blockingMs: 22, action: "load_on_first_interaction" as const },
    ];
    expect(tagEstimate(214, scripts)).toEqual({ saving: 72, projected: 142 });
  });
});
