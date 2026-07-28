import "server-only";

import { connection } from "next/server";
import { Suspense } from "react";

import { PublicAggregateCounters } from "../../components/public-aggregate-counters";
import type { PublicAggregateCountersDto } from "../../types/public-aggregate-counters.types";
import { loadPublicAggregateCounters } from "../services/server-public-aggregate-counters.service";

interface PublicAggregateCountersSlotDependencies {
  load(): Promise<PublicAggregateCountersDto | null>;
  waitForRequest(): Promise<void>;
}

export function createPublicAggregateCountersSlot({
  load,
  waitForRequest,
}: PublicAggregateCountersSlotDependencies) {
  return async function PublicAggregateCountersSlotBoundary() {
    await waitForRequest();
    const counters = await load();

    return <PublicAggregateCounters counters={counters} />;
  };
}

const PublicAggregateCountersContent = createPublicAggregateCountersSlot({
  load: loadPublicAggregateCounters,
  waitForRequest: connection,
});

export function PublicAggregateCountersSlot() {
  return (
    <Suspense fallback={null}>
      <PublicAggregateCountersContent />
    </Suspense>
  );
}
