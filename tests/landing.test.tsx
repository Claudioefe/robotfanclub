import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Landing } from "@/components/landing/Landing";
import { CONTACT_EMAIL, contactHref } from "@/lib/brand";

// The landing is a design port: these checks guard the product promises it prints and the pieces that must not regress.
describe("landing page", () => {
  const html = renderToStaticMarkup(<Landing />);

  it("prints the SLA terms exactly as the product rules define them", () => {
    for (const text of [
      "Make the robots your",
      "Floor 12, target 18, bonus 25 citations per 60-day window.",
      "At least 30% must come from pages outside that day",
      "Under 12 on day 60? 20% of the fee comes back as credit.",
      "INP p75 on mobile at or under 200 ms.",
      "Held for two full 28-day CrUX windows after the sprint ships.",
      "Measured in the US · English · mobile · same hour daily",
    ]) expect(html).toContain(text);
  });

  it("keeps the in-page anchors working and links clients to sign in", () => {
    for (const id of ['id="top"', 'id="how"', 'id="offers"', 'id="receipts"', 'id="join"']) expect(html).toContain(id);
    expect(html).toContain('href="/login"');
  });

  it("has no placeholder left: without a contact email the button scrolls to its own section", () => {
    expect(html).not.toContain("YOUR EMAIL");
    expect(CONTACT_EMAIL).toBe("");
    expect(contactHref).toBe("#join");
  });

  it("starts calm: the disco mode is off until someone presses the secret button", () => {
    expect(html).toContain("Robots only beyond this point");
    expect(html).toContain("Do not press");
    expect(html).not.toContain("Secret robot party detected");
  });
});
