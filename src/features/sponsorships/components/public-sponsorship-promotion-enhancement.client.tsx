"use client";

import { useOptionalPublicData } from "@/shared/hooks/use-optional-public-data";

import { fetchPublicSponsorshipPromotion } from "../api/public-sponsorship-promotion.api";
import { PublicSponsorshipPromotion } from "./public-sponsorship-promotion";

export function PublicSponsorshipPromotionEnhancement() {
  const promotion = useOptionalPublicData(fetchPublicSponsorshipPromotion);

  return <PublicSponsorshipPromotion promotion={promotion} />;
}
