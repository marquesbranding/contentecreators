import { describe, expect, it } from "vitest";

import {
  customNicheSlug,
  isCustomNicheSlug,
  isPredefinedCompanySegment,
} from "./profile-segments";

describe("profile segments", () => {
  it("creates a stable, valid slug for a custom creator niche", () => {
    const slug = customNicheSlug("  Artesanato sustentável & DIY  ");

    expect(slug).toBe("personalizado-artesanato-sustentavel-diy");
    expect(isCustomNicheSlug(slug)).toBe(true);
  });

  it("distinguishes predefined company segments from custom values", () => {
    expect(isPredefinedCompanySegment("Tecnologia")).toBe(true);
    expect(isPredefinedCompanySegment("Economia criativa")).toBe(false);
  });
});
