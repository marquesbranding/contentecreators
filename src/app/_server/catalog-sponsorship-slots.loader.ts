import "server-only";

import {
  createServerSponsorshipDeliveryService,
  type SponsorshipDeliveryQuery,
} from "@/features/sponsorships/server";
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
  const [top, side, carousel, featured] = await Promise.all([
    dependencies.load({
      ...baseQuery,
      allowedPlacementTypes: ["TOP_BANNER"],
      limit: 1,
      slotKey: "catalog-top",
    }),
    dependencies.load({
      ...baseQuery,
      allowedPlacementTypes: ["INLINE_BANNER"],
      limit: 1,
      slotKey: "catalog-inline",
    }),
    dependencies.load({
      ...baseQuery,
      allowedPlacementTypes: ["CAROUSEL"],
      limit: 10,
      slotKey: "catalog-carousel",
    }),
    dependencies.load({
      ...baseQuery,
      allowedPlacementTypes: ["FEATURED_CREATOR"],
      limit: 1,
      slotKey: "catalog-featured",
    }),
  ]);

  return {
    carousel: carousel.map((placement) => ({
      audienceMatches: true,
      placement,
      routeMatches: true,
    })),
    featured: toSlot(featured[0]),
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
