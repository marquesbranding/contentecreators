"use client";

import { useOptionalPublicData } from "@/shared/hooks/use-optional-public-data";

import { fetchPublicSponsorshipPromotions } from "../api/public-sponsorship-promotion.api";
import { PublicSponsorshipPromotion } from "./public-sponsorship-promotion";

export function PublicSponsorshipPromotionEnhancement() {
  const promotions = useOptionalPublicData(fetchPublicSponsorshipPromotions);

  return <PublicSponsorshipPromotion promotions={promotions} />;
}
