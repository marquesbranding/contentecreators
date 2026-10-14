import {
  createPublicSponsorshipPromotionRouteHandler,
  createServerSponsorshipDeliveryService,
  loadPublicSponsorshipPromotions,
} from "@/features/sponsorships/server";

export const runtime = "nodejs";

export const GET = createPublicSponsorshipPromotionRouteHandler({
  load: () =>
    loadPublicSponsorshipPromotions({
      delivery: createServerSponsorshipDeliveryService(),
      now: new Date(),
    }),
});
