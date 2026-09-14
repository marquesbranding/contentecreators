import { describe, expect, it } from "vitest";

import {
  companySegmentOptions,
  creatorNicheOptions,
  customNicheSlug,
  isCustomNicheSlug,
  isPredefinedCompanySegment,
  OTHER_NICHE_SLUG,
} from "./profile-segments";

describe("profile segments", () => {
  it("creates a stable, valid slug for a custom creator niche", () => {
    const slug = customNicheSlug("  Artesanato sustentável & DIY  ");

    expect(slug).toBe("personalizado-artesanato-sustentavel-diy");
    expect(isCustomNicheSlug(slug)).toBe(true);
  });

  it("distinguishes predefined company segments from custom values", () => {
    expect(isPredefinedCompanySegment("Tecnologia, games e inovação")).toBe(
      true,
    );
    expect(isPredefinedCompanySegment("Economia criativa")).toBe(false);
  });

  it("mirrors the creator niche labels as company segments, plus Outros", () => {
    const creatorLabels = creatorNicheOptions
      .filter(([slug]) => slug !== OTHER_NICHE_SLUG)
      .map(([, label]) => label);

    expect(companySegmentOptions.map(([value]) => value)).toEqual([
      ...creatorLabels,
      "OTHER",
    ]);
    expect(companySegmentOptions.at(-1)).toEqual(["OTHER", "Outros"]);
  });
});
