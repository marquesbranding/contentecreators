import { describe, expect, it } from "vitest";

import { placementsToDeactivateOnActivate } from "./placement-activation-conflicts";
import {
  allowsMultipleActive,
  placementSlotCatalog,
} from "./placement-slot-catalog";

describe("placementsToDeactivateOnActivate", () => {
  it("returns the other active placement of a single-item slot", () => {
    expect(
      placementsToDeactivateOnActivate({
        activePlacements: [
          { id: "y", slotKey: "catalog-top" },
          { id: "z", slotKey: "catalog-inline" },
        ],
        slotKey: "catalog-top",
        targetId: "x",
      }),
    ).toEqual(["y"]);
  });

  it("returns every other active placement when legacy data has several", () => {
    expect(
      placementsToDeactivateOnActivate({
        activePlacements: [
          { id: "y1", slotKey: "catalog-inline" },
          { id: "y2", slotKey: "catalog-inline" },
        ],
        slotKey: "catalog-inline",
        targetId: "x",
      }),
    ).toEqual(["y1", "y2"]);
  });

  it("never deactivates anything in carousel and list slots", () => {
    for (const slotKey of [
      "landing-top",
      "catalog-featured",
      "catalog-carousel",
      "catalog-midlist",
    ]) {
      expect(
        placementsToDeactivateOnActivate({
          activePlacements: [{ id: "y", slotKey }],
          slotKey,
          targetId: "x",
        }),
      ).toEqual([]);
    }
  });

  it("returns nothing when the target is already active or alone", () => {
    expect(
      placementsToDeactivateOnActivate({
        activePlacements: [
          { id: "x", slotKey: "catalog-top" },
          { id: "y", slotKey: "catalog-top" },
        ],
        slotKey: "catalog-top",
        targetId: "x",
      }),
    ).toEqual([]);
    expect(
      placementsToDeactivateOnActivate({
        activePlacements: [],
        slotKey: "catalog-top",
        targetId: "x",
      }),
    ).toEqual([]);
  });

  it("does not block unknown slots", () => {
    expect(allowsMultipleActive("legacy-slot")).toBe(true);
    expect(
      placementsToDeactivateOnActivate({
        activePlacements: [{ id: "y", slotKey: "legacy-slot" }],
        slotKey: "legacy-slot",
        targetId: "x",
      }),
    ).toEqual([]);
  });

  it("matches the catalog display modes", () => {
    expect(
      Object.fromEntries(
        placementSlotCatalog.map((slot) => [slot.slotKey, slot.displayMode]),
      ),
    ).toEqual({
      "catalog-top": "SINGLE",
      "landing-top": "CAROUSEL",
      "catalog-carousel": "CAROUSEL",
      "catalog-midlist": "LIST",
      "catalog-inline": "SINGLE",
      "catalog-featured": "CAROUSEL",
    });
  });
});
