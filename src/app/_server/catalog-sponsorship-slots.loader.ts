import "server-only";

import {
  createServerSponsorshipDeliveryService,
  type SponsorshipDeliveryQuery,
} from "@/features/sponsorships/server";
import { getPlacementSlot } from "@/features/sponsorships";
import type { RendererPlacementDto } from "@/features/sponsorships";

import type { CatalogSponsorshipSlotsDto } from "../_components/catalog-sponsorship-slots";

type CatalogAccountRole = "COMPANY" | "INFLUENCER";

interface CatalogSponsorshipLoaderDependencies {
  load(query: SponsorshipDeliveryQuery): Promise<RendererPlacementDto[]>;
  now(): Date;
}

function toSlot(placement: RendererPlacementDto | undefined) {
  return placement
    ? {
        audienceMatches: true,
        placement,
        routeMatches: true,
      }
    : null;
}

export async function loadCatalogSponsorshipSlots(
  role: CatalogAccountRole,
  dependencies: CatalogSponsorshipLoaderDependencies,
): Promise<CatalogSponsorshipSlotsDto> {
  const now = dependencies.now();
  const viewer =
    role === "COMPANY" ? "APPROVED_COMPANY" : "APPROVED_INFLUENCER";
  const baseQuery = {
    now,
    route: "CATALOG",
    viewer,
  } as const;
  const [top, side, carousel, featured, midlist] = await Promise.all([
    dependencies.load({
      ...baseQuery,
      allowedPlacementTypes: [getPlacementSlot("catalog-top")!.placementType],
      limit: getPlacementSlot("catalog-top")!.limit,
      slotKey: "catalog-top",
    }),
    dependencies.load({
      ...baseQuery,
      allowedPlacementTypes: [
        getPlacementSlot("catalog-inline")!.placementType,
      ],
      limit: getPlacementSlot("catalog-inline")!.limit,
      slotKey: "catalog-inline",
    }),
    dependencies.load({
      ...baseQuery,
      allowedPlacementTypes: [
        getPlacementSlot("catalog-carousel")!.placementType,
      ],
      limit: getPlacementSlot("catalog-carousel")!.limit,
      slotKey: "catalog-carousel",
    }),
    dependencies.load({
      ...baseQuery,
      allowedPlacementTypes: [
        getPlacementSlot("catalog-featured")!.placementType,
      ],
      limit: getPlacementSlot("catalog-featured")!.limit,
      slotKey: "catalog-featured",
    }),
    /* A second wave of ads rendered partway down the listing. It reuses the
     * CAROUSEL type on its own slot key, so no new placement type or
     * migration is needed — operators just pick this slot key. */
    dependencies.load({
      ...baseQuery,
      allowedPlacementTypes: [
        getPlacementSlot("catalog-midlist")!.placementType,
      ],
      limit: getPlacementSlot("catalog-midlist")!.limit,
      slotKey: "catalog-midlist",
    }),
  ]);

  return {
    carousel: carousel.map((placement) => ({
      audienceMatches: true,
      placement,
      routeMatches: true,
    })),
    featured: toSlot(featured[0]),
    midlist: midlist.map((placement) => ({
      audienceMatches: true,
      placement,
      routeMatches: true,
    })),
    side: toSlot(side[0]),
    top: toSlot(top[0]),
  };
}

export async function loadServerCatalogSponsorshipSlots(
  role: CatalogAccountRole,
) {
  const service = createServerSponsorshipDeliveryService();

  return loadCatalogSponsorshipSlots(role, {
    load: service.load,
    now: () => new Date(),
  });
}
