import { describe, it, expect } from "vitest";
import {
  getPlacementSlot,
  placementSlotCatalog,
} from "./placement-slot-catalog";
import {
  formDefaults,
  placementFormSchema,
  toDateTimeLocal,
  toIso,
} from "../schemas/placement-form.schema";
describe("placement slot catalog", () => {
  it("defines the six actual surfaces and their image requirements", () => {
    expect(new Set(placementSlotCatalog.map((slot) => slot.slotKey)).size).toBe(
      6,
    );
    expect(getPlacementSlot("catalog-top")?.image).toMatchObject({
      width: 1600,
      height: 500,
    });
    expect(getPlacementSlot("catalog-midlist")).toMatchObject({
      supportsVariants: false,
      limit: 3,
      image: { width: 900, height: 1200 },
    });
    expect(getPlacementSlot("catalog-featured")).toMatchObject({
      usesImage: false,
      usesLink: false,
    });
    expect(getPlacementSlot("catalog-inline")?.bodyRequired).toBe(false);
    expect(getPlacementSlot("unknown")).toBeUndefined();
  });
  it("accepts incomplete drafts while preventing mismatched type/slot and half a CTA", () => {
    const draft = formDefaults();
    expect(placementFormSchema.safeParse(draft).success).toBe(true);
    expect(
      placementFormSchema.safeParse({ ...draft, placementType: "CAROUSEL" })
        .success,
    ).toBe(false);
    expect(
      placementFormSchema.safeParse({
        ...draft,
        linkUrl: "https://example.com",
      }).success,
    ).toBe(true);
    expect(
      placementFormSchema.safeParse({
        ...draft,
        linkUrl: "https://example.com",
        linkLabel: "Conheça",
      }).success,
    ).toBe(true);
  });
  it("round trips Brasília schedules independently of the machine timezone", () => {
    const date = "2026-09-15T19:30:00.000Z";
    expect(toDateTimeLocal(date)).toBe("2026-09-15T16:30");
    expect(toIso("2026-09-15T16:30")).toBe(date);
    expect(toIso("")).toBeNull();
  });
});

it("validates optional link controls consistently in the wizard", () => {
  const draft = formDefaults();
  expect(draft.showSponsoredBadge).toBe(true);
  expect(draft.showAdvertiserLabel).toBe(false);
  expect(draft.advertiserLabel).toBe("Contente Creators");
  for (const linkOnCreative of [true, false]) {
    for (const linkLabel of ["", "Conheça"]) {
      expect(
        placementFormSchema.safeParse({
          ...draft,
          linkOnCreative,
          linkLabel,
          linkUrl: "https://example.com",
        }).success,
      ).toBe(true);
      expect(
        placementFormSchema.safeParse({
          ...draft,
          linkOnCreative,
          linkLabel,
          linkUrl: "",
        }).success,
      ).toBe(!linkOnCreative && !linkLabel);
    }
  }
  expect(
    placementFormSchema.safeParse({
      ...draft,
      showAdvertiserLabel: true,
      advertiserLabel: "",
    }).success,
  ).toBe(false);
  expect(
    placementFormSchema.safeParse({ ...draft, textColor: "red" }).success,
  ).toBe(false);
  expect(getPlacementSlot("landing-top")?.image).toEqual(
    getPlacementSlot("catalog-top")?.image,
  );
});
