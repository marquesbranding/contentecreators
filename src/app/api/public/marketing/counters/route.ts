import {
  createPublicAggregateCountersRouteHandler,
  loadPublicAggregateCounters,
} from "@/features/marketing/server";

export const runtime = "nodejs";

export const GET = createPublicAggregateCountersRouteHandler({
  load: loadPublicAggregateCounters,
});
