import {
  createPublicSponsorshipPromotionRouteHandler,
  createServerSponsorshipDeliveryService,
  loadPublicSponsorshipPromotion,
} from "@/features/sponsorships/server";

export const runtime = "nodejs";

export const GET = createPublicSponsorshipPromotionRouteHandler({
  load: () =>
    loadPublicSponsorshipPromotion({
      delivery: createServerSponsorshipDeliveryService(),
      now: new Date(),
    }),
});
