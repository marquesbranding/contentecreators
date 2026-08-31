import { describe, expect, it, vi } from "vitest";

import type { RendererPlacementDto } from "@/features/sponsorships";

import { loadCatalogSponsorshipSlots } from "./catalog-sponsorship-slots.loader";

function placement(
  id: string,
  type: RendererPlacementDto["type"],
): RendererPlacementDto {
  return {
    body: null,
    eligible: true,
    id,
    linkLabel: null,
    linkUrl: null,
    media: null,
    sortOrder: 10,
    title: `Placement ${id}`,
    type,
  };
}

describe("catalog sponsorship slots loader", () => {
  it("loads the five fixed catalog slots in parallel for an approved company", async () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const bySlot: Record<string, RendererPlacementDto[]> = {
      "catalog-carousel": [
        placement("30000000-0000-4000-8000-000000000001", "CAROUSEL"),
        placement("30000000-0000-4000-8000-000000000002", "CAROUSEL"),
      ],
      "catalog-featured": [
        placement("40000000-0000-4000-8000-000000000001", "FEATURED_CREATOR"),
      ],
      "catalog-inline": [
        placement("20000000-0000-4000-8000-000000000001", "INLINE_BANNER"),
      ],
      "catalog-midlist": [
        placement("50000000-0000-4000-8000-000000000001", "CAROUSEL"),
      ],
      "catalog-top": [
        placement("10000000-0000-4000-8000-000000000001", "TOP_BANNER"),
      ],
    };
    const load = vi.fn(async ({ slotKey }) => bySlot[slotKey] ?? []);

    const slots = await loadCatalogSponsorshipSlots("COMPANY", {
      load,
      now: () => now,
    });

    expect(load).toHaveBeenCalledTimes(5);
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedPlacementTypes: ["TOP_BANNER"],
        now,
        route: "CATALOG",
        slotKey: "catalog-top",
        viewer: "APPROVED_COMPANY",
      }),
    );
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedPlacementTypes: ["CAROUSEL"],
        slotKey: "catalog-midlist",
      }),
    );
    expect(slots.top?.placement.id).toBe(
      "10000000-0000-4000-8000-000000000001",
    );
    expect(slots.carousel).toHaveLength(2);
    expect(slots.midlist?.[0]?.placement.id).toBe(
      "50000000-0000-4000-8000-000000000001",
    );
  });

  it("maps an approved influencer and preserves empty slots", async () => {
    const load = vi.fn(async () => []);

    const slots = await loadCatalogSponsorshipSlots("INFLUENCER", {
      load,
      now: () => new Date("2026-07-28T12:00:00.000Z"),
    });

    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({ viewer: "APPROVED_INFLUENCER" }),
    );
    expect(slots).toEqual({
      carousel: [],
      featured: null,
      midlist: [],
      side: null,
      top: null,
    });
  });
});
