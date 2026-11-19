import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COPY, parseLang } from "@/components/guide/copy";
import { GuideView } from "@/components/guide/GuideView";

// The public explanation page must keep saying exactly what the product rules say, in both languages.
const IDS = ["problem", "who", "citations", "top10", "speed", "queries", "cited", "limits", "next"];

describe("guide page (English)", () => {
  const html = renderToStaticMarkup(<GuideView lang="en" />);

  it("states the SLA terms as the product rules define them", () => {
    for (const text of ["12", "18", "25", "60-day window", "20% of the fee comes back as credit", "30% of the citations", "200 ms", "two full 28-day windows", "US, English, mobile"]) {
      expect(html).toContain(text);
    }
  });

  it("has every section the table of contents points to", () => {
    for (const id of IDS) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`href="#${id}"`);
    }
  });

  it("is honest about what is not built or not guaranteed", () => {
    expect(html).toContain("An AI advisor. Not built yet.");
    expect(html).toContain("does not promise positions or specific citations");
    expect(html).toContain("does not cover ChatGPT");
  });

  it("links back to the home page and to the sign-in, and offers the Spanish version", () => {
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/#join"');
    expect(html).toContain('href="/guide?lang=es"');
    expect(html).toContain('lang="en"');
  });
});

describe("guide page (Spanish)", () => {
  const html = renderToStaticMarkup(<GuideView lang="es" />);

  it("says the same rules with the same numbers", () => {
    for (const text of ["12", "18", "25", "ventana de 60 días", "20% del fee vuelve como crédito", "30% de las citas", "200 ms", "dos ventanas completas de 28 días", "EE. UU., inglés, celular"]) {
      expect(html).toContain(text);
    }
  });

  it("keeps the same sections and is as honest as the English one", () => {
    for (const id of IDS) expect(html).toContain(`id="${id}"`);
    expect(html).toContain("Todavía no está construido");
    expect(html).toContain("No promete posiciones ni citas concretas");
    expect(html).toContain('lang="es"');
    expect(html).toContain('href="/guide"'); // back to English
  });
});

describe("languages", () => {
  it("both versions have the same structure, so nothing is missing in one of them", () => {
    const shape = (v: unknown): unknown => (Array.isArray(v) ? v.map(shape) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v);
    expect(shape(COPY.es)).toEqual(shape(COPY.en));
    expect(COPY.es.sections.map(([id]) => id)).toEqual(COPY.en.sections.map(([id]) => id));
    expect(COPY.es.glossary.terms.length).toBe(COPY.en.glossary.terms.length);
  });

  it("falls back to English for anything unknown", () => {
    expect(parseLang(undefined)).toBe("en");
    expect(parseLang("es")).toBe("es");
    expect(parseLang(["es", "en"])).toBe("es");
    expect(parseLang("fr")).toBe("en");
    expect(parseLang("")).toBe("en");
  });
});
