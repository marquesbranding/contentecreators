import "server-only";

import { connection } from "next/server";
import { Suspense } from "react";

import { PublicSponsorshipPromotion } from "../../components/public-sponsorship-promotion";
import { loadPublicSponsorshipPromotion } from "../queries/public-sponsorship-promotion.query";
import { createServerSponsorshipDeliveryService } from "../services/server-sponsorship-delivery.service";

interface PublicSponsorshipPromotionSlotDependencies {
  createDelivery: typeof createServerSponsorshipDeliveryService;
  now(): Date;
  waitForRequest(): Promise<void>;
}

export function createPublicSponsorshipPromotionSlot({
  createDelivery,
  now,
  waitForRequest,
}: PublicSponsorshipPromotionSlotDependencies) {
  return async function PublicSponsorshipPromotionSlotBoundary() {
    await waitForRequest();
    const promotion = await loadPublicSponsorshipPromotion({
      delivery: createDelivery(),
      now: now(),
    });

    return promotion ? (
      <PublicSponsorshipPromotion promotion={promotion} />
    ) : null;
  };
}

const PublicSponsorshipPromotionContent = createPublicSponsorshipPromotionSlot({
  createDelivery: createServerSponsorshipDeliveryService,
  now: () => new Date(),
  waitForRequest: connection,
});

export function PublicSponsorshipPromotionSlot() {
  return (
    <Suspense fallback={null}>
      <PublicSponsorshipPromotionContent />
    </Suspense>
  );
}
