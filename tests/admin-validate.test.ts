import { describe, expect, it } from "vitest";
import {
  MAX_QUERIES,
  isEmail,
  nextWindowStart,
  normalizeDomain,
  parseClient,
  parseCruxTarget,
  parseQueryList,
  parseSprint,
  parseTagScript,
  windowFrom,
} from "@/lib/admin/validate";

describe("domains and clients", () => {
  it("normalizes a domain", () => {
    expect(normalizeDomain("https://www.Example.com/path?x=1")).toBe("example.com");
    expect(normalizeDomain("  northwindsec.com ")).toBe("northwindsec.com");
    expect(normalizeDomain("not a domain")).toBeNull();
    expect(normalizeDomain("localhost")).toBeNull();
  });

  it("requires a kind, so a forgotten one never defaults to real", () => {
    const base = { name: "Acme", domain: "acme.com", feeUsd: "" };
    expect(parseClient({ ...base, kind: "" })).toMatchObject({ ok: false });
    expect(parseClient({ ...base, kind: "production" })).toMatchObject({ ok: false });
    expect(parseClient({ ...base, kind: "real" })).toEqual({ ok: true, value: { name: "Acme", domain: "acme.com", kind: "real", feeUsd: null } });
  });

  it("validates the name and the fee", () => {
    expect(parseClient({ name: " ", domain: "a.com", kind: "demo", feeUsd: "" }).ok).toBe(false);
    expect(parseClient({ name: "A", domain: "a.com", kind: "demo", feeUsd: "-5" }).ok).toBe(false);
    expect(parseClient({ name: "A", domain: "a.com", kind: "demo", feeUsd: "abc" }).ok).toBe(false);
    expect(parseClient({ name: "A", domain: "a.com", kind: "demo", feeUsd: "14500" })).toMatchObject({ ok: true, value: { feeUsd: 14500 } });
  });
});

describe("query lists", () => {
  it("trims, collapses spaces, drops blanks and removes duplicates ignoring case", () => {
    const r = parseQueryList("  SOC 2 cost \n\nsoc 2   cost\nhow long does soc 2 take\r\n");
    expect(r).toEqual({ ok: true, value: { queries: ["SOC 2 cost", "how long does soc 2 take"], duplicatesRemoved: 1 } });
  });

  it("holds at most 60 queries, counted after removing duplicates", () => {
    const sixty = Array.from({ length: MAX_QUERIES }, (_, i) => `query ${i}`).join("\n");
    expect(parseQueryList(sixty)).toMatchObject({ ok: true });
    expect(parseQueryList(`${sixty}\nquery 60`)).toMatchObject({ ok: false });
    expect(parseQueryList(`${sixty}\nQUERY 0`)).toMatchObject({ ok: true }); // a duplicate does not count
  });

  it("rejects empty input and over-long queries", () => {
    expect(parseQueryList("  \n \n")).toMatchObject({ ok: false });
    expect(parseQueryList("x".repeat(201))).toMatchObject({ ok: false });
  });
});

describe("windows", () => {
  it("a window is 60 days inclusive", () => {
    expect(windowFrom("2026-11-18")).toEqual({ from: "2026-11-18", until: "2027-01-16" });
    expect(windowFrom("2026-10-11").until).toBe("2026-12-09"); // the demo window
  });

  it("starts today when no window is running, and the day after the running one otherwise", () => {
    expect(nextWindowStart("2026-11-18", [])).toBe("2026-11-18");
    expect(nextWindowStart("2026-11-18", ["2026-10-01"])).toBe("2026-11-18"); // old window already ended
    expect(nextWindowStart("2026-11-18", ["2026-12-09", "2026-10-01"])).toBe("2026-12-10");
    expect(nextWindowStart("2026-12-09", ["2026-12-09"])).toBe("2026-12-10"); // ends today: still running today
  });
});

describe("sprint and CrUX targets", () => {
  it("validates the deploy date and the baseline, both optional", () => {
    expect(parseSprint({ deployedOn: "2026-10-26", baselineMs: "296" })).toEqual({ ok: true, value: { deployedOn: "2026-10-26", baselineMs: 296 } });
    expect(parseSprint({ deployedOn: "", baselineMs: "" })).toEqual({ ok: true, value: { deployedOn: null, baselineMs: null } });
    expect(parseSprint({ deployedOn: "26/10/2026", baselineMs: "" }).ok).toBe(false);
    expect(parseSprint({ deployedOn: "2026-13-40", baselineMs: "" }).ok).toBe(false);
    expect(parseSprint({ deployedOn: "", baselineMs: "-3" }).ok).toBe(false);
    expect(parseSprint({ deployedOn: "", baselineMs: "12.5" }).ok).toBe(false);
  });

  it("keeps the origin exact (www matters) and drops its path", () => {
    expect(parseCruxTarget("origin", "https://www.baumanrarebooks.com/some/page?x=1")).toEqual({ ok: true, value: { scope: "origin", target: "https://www.baumanrarebooks.com" } });
    expect(parseCruxTarget("origin", "https://baumanrarebooks.com")).toMatchObject({ value: { target: "https://baumanrarebooks.com" } });
    expect(parseCruxTarget("url", "https://www.baumanrarebooks.com/blog/")).toMatchObject({ ok: true, value: { scope: "url", target: "https://www.baumanrarebooks.com/blog/" } });
    expect(parseCruxTarget("url", "baumanrarebooks.com").ok).toBe(false);
    expect(parseCruxTarget("url", "ftp://x.com/a").ok).toBe(false);
    expect(parseCruxTarget("host", "https://x.com").ok).toBe(false);
  });
});

describe("Tag Bouncer scripts", () => {
  const base = { label: "Live chat widget", scriptUrl: "https://chat.example.com/widget.js", blockingMs: "62", action: "keep", isRequired: false };

  it("accepts a valid script and derives its host", () => {
    expect(parseTagScript(base)).toEqual({
      ok: true,
      value: { label: "Live chat widget", scriptUrl: "https://chat.example.com/widget.js", scriptHost: "chat.example.com", blockingMs: 62, action: "keep", isRequired: false },
    });
  });

  it("rejects bad input and never lets a required script be removed", () => {
    expect(parseTagScript({ ...base, scriptUrl: "chat.example.com" }).ok).toBe(false);
    expect(parseTagScript({ ...base, blockingMs: "-1" }).ok).toBe(false);
    expect(parseTagScript({ ...base, action: "delete" }).ok).toBe(false);
    expect(parseTagScript({ ...base, action: "remove", isRequired: true }).ok).toBe(false);
    expect(parseTagScript({ ...base, action: "remove", isRequired: false }).ok).toBe(true);
  });
});

describe("emails", () => {
  it("checks the shape of an email", () => {
    expect(isEmail("person@example.com")).toBe(true);
    expect(isEmail(" person@example.com ")).toBe(true);
    expect(isEmail("person@")).toBe(false);
    expect(isEmail("no spaces@example.com")).toBe(false);
  });
});
