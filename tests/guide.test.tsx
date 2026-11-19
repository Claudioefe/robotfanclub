import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GuidePage from "@/app/guide/page";

// next/font only works inside Next's compiler: give the page plain class names instead.
vi.mock("@/components/landing/fonts", () => ({ grotesk: { variable: "g" }, inter: { variable: "i" }, jbmono: { variable: "j" } }));

// The public explanation page must keep saying exactly what the product rules say.
describe("guide page", () => {
  const html = renderToStaticMarkup(<GuidePage />);

  it("states the SLA terms as the product rules define them", () => {
    for (const text of ["12", "18", "25", "60-day window", "20% of the fee comes back as credit", "30% of the citations", "200 ms", "two full 28-day windows", "US, English, mobile"]) {
      expect(html).toContain(text);
    }
  });

  it("has every section the table of contents points to", () => {
    for (const id of ["problem", "who", "citations", "top10", "speed", "queries", "cited", "limits", "next"]) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`href="#${id}"`);
    }
  });

  it("is honest about what is not built or not guaranteed", () => {
    expect(html).toContain("An AI advisor. Not built yet.");
    expect(html).toContain("does not promise positions or specific citations");
    expect(html).toContain("does not cover ChatGPT");
  });

  it("links back to the home page and to the sign-in", () => {
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/#join"');
  });
});
