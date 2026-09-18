import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  sponsorshipAccessibleName,
  toAppearanceStyle,
} from "./sponsorship-appearance";

describe("sponsorship appearance", () => {
  it("calculates WCAG contrast for equal colors and black/white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(contrastRatio("#123456", "#123456")).toBe(1);
    expect(contrastRatio("red", "#ffffff")).toBeNull();
  });
  it("only renders validated colors and an allowlisted font", () => {
    expect(
      toAppearanceStyle({ textColor: "url(evil)", fontFamily: "arbitrary" }),
    ).toEqual({});
    expect(
      toAppearanceStyle({ textColor: "#111111", fontFamily: "serif" }),
    ).toEqual({
      color: "#111111",
      fontFamily: "var(--font-sponsor-serif, serif)",
    });
    expect(
      toAppearanceStyle(
        { buttonBackgroundColor: "#FF5500", buttonTextColor: "#FFFFFF" },
        true,
      ),
    ).toEqual({ backgroundColor: "#FF5500", color: "#FFFFFF" });
  });
  it("uses image alt, title, advertiser, then a generic accessible name", () => {
    expect(
      sponsorshipAccessibleName({ imageAlt: "Arte", title: "Título" }),
    ).toBe("Arte");
    expect(
      sponsorshipAccessibleName({ title: "Título", advertiserLabel: "Marca" }),
    ).toBe("Título");
    expect(sponsorshipAccessibleName({ advertiserLabel: "Marca" })).toBe(
      "Patrocínio de Marca",
    );
    expect(sponsorshipAccessibleName({})).toBe("Patrocínio");
  });
});
