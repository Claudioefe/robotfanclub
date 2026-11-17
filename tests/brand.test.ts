import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";

describe("brand", () => {
  it("exposes the product name and tagline", () => {
    expect(BRAND.name).toBe("Robot Fan Club");
    expect(BRAND.tagline).toBe("Make the robots your biggest fans.");
  });
});
