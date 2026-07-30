import "server-only";

import type { PublicAggregateCountersDto } from "../../types/public-aggregate-counters.types";

interface PublicAggregateCountersRouteDependencies {
  load(): Promise<PublicAggregateCountersDto | null>;
}

const publicCacheHeaders = {
  "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
};

const unavailableHeaders = {
  "cache-control": "no-store",
};

export function createPublicAggregateCountersRouteHandler({
  load,
}: PublicAggregateCountersRouteDependencies) {
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
