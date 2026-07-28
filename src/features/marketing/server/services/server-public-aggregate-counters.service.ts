import "server-only";

import { loadServerApprovedPublicCounts } from "../repositories/drizzle-public-aggregate-counters.repository";
import { createPublicAggregateCountersService } from "./public-aggregate-counters.service";

export function createServerPublicAggregateCountersService() {
  return createPublicAggregateCountersService({
    loadApprovedCounts: loadServerApprovedPublicCounts,
  });
}

export function loadPublicAggregateCounters() {
  return createServerPublicAggregateCountersService().load();
}
