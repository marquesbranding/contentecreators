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
      image: { width: 1000, height: 800 },
    });
    expect(getPlacementSlot("catalog-featured")).toMatchObject({
      usesImage: false,
      usesLink: false,
    });
    expect(getPlacementSlot("catalog-inline")?.bodyRequired).toBe(true);
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
    ).toBe(false);
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
