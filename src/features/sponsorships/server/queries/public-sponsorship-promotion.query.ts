import "server-only";

import { getPlacementSlot } from "../../domain/placement-slot-catalog";
import type { RendererPlacementDto } from "../../types/sponsorship-placement.types";
import type { SponsorshipDeliveryQuery } from "../repositories/sponsorship-delivery.repository";

export interface PublicSponsorshipDelivery {
  load(query: SponsorshipDeliveryQuery): Promise<RendererPlacementDto[]>;
}

function isGenericPublicPromotion(placement: RendererPlacementDto) {
  return Boolean(
    placement.eligible &&
    placement.type === "TOP_BANNER" &&
    placement.featuredCreator == null &&
    placement.media,
  );
}

/**
 * Every generic public banner for the landing, in delivery order
 * (`sortOrder`), up to the `landing-top` slot limit. Empty when none is
 * active or delivery is unavailable.
 */
export async function loadPublicSponsorshipPromotions({
  delivery,
  now,
}: {
  delivery: PublicSponsorshipDelivery;
  now: Date;
}): Promise<RendererPlacementDto[]> {
  try {
    const placements = await delivery.load({
      allowedPlacementTypes: [getPlacementSlot("landing-top")!.placementType],
      limit: getPlacementSlot("landing-top")!.limit,
      now,
      route: "PUBLIC_LANDING",
      slotKey: "landing-top",
      viewer: "PUBLIC",
    });

    return placements.filter(isGenericPublicPromotion);
  } catch {
    return [];
  }
}
