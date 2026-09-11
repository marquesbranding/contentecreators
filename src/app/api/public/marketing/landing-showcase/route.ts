import {
  createPublicLandingShowcaseRouteHandler,
  loadPublicLandingShowcase,
} from "@/features/marketing/server";

export const runtime = "nodejs";

export const GET = createPublicLandingShowcaseRouteHandler({
  load: loadPublicLandingShowcase,
});
