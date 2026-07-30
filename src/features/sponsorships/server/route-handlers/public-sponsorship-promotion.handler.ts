import "server-only";

import type { RendererPlacementDto } from "../../types/sponsorship-placement.types";

interface PublicSponsorshipPromotionRouteDependencies {
  load(): Promise<RendererPlacementDto | null>;
}

const publicCacheHeaders = {
  "cache-control": "public, s-maxage=60, stale-while-revalidate=240",
};

const unavailableHeaders = {
  "cache-control": "no-store",
};

export function createPublicSponsorshipPromotionRouteHandler({
  load,
}: PublicSponsorshipPromotionRouteDependencies) {
  return async function GET() {
    try {
      return Response.json(await load(), {
        headers: publicCacheHeaders,
        status: 200,
      });
    } catch {
      return Response.json(null, {
        headers: unavailableHeaders,
        status: 503,
      });
    }
  };
}
