import "server-only";

import type { PublicCommunityProofDto } from "../../types/public-community-proof.types";

interface PublicCommunityProofRouteDependencies {
  load(): Promise<PublicCommunityProofDto | null>;
}

const publicCacheHeaders = {
  "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
};

const unavailableHeaders = {
  "cache-control": "no-store",
};

export function createPublicCommunityProofRouteHandler({
  load,
}: PublicCommunityProofRouteDependencies) {
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
