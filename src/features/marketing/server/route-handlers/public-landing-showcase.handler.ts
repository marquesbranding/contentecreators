import "server-only";

import type { PublicLandingShowcaseDto } from "../../types/public-landing-showcase.types";

interface PublicLandingShowcaseRouteDependencies {
  load(): Promise<PublicLandingShowcaseDto | null>;
}

/**
 * The longest a CDN may keep serving one response: `s-maxage` plus the
 * stale-while-revalidate tail. Signed image URLs in the payload must outlive
 * this — see `publicShowcaseImageLifetimeSeconds`.
 */
export const publicLandingShowcaseCacheWindowSeconds = 60 + 300;

export function createPublicLandingShowcaseRouteHandler({
  load,
}: PublicLandingShowcaseRouteDependencies) {
  return async function GET() {
    try {
      return Response.json(await load(), {
        headers: {
          "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        },
        status: 200,
      });
    } catch {
      return Response.json(null, {
        headers: { "cache-control": "no-store" },
        status: 503,
      });
    }
  };
}
