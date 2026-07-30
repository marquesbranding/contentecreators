"use client";

import { fetchPublicAggregateCounters } from "../api/public-aggregate-counters.api";
import { useOptionalPublicData } from "@/shared/hooks/use-optional-public-data";

import { PublicAggregateCounters } from "./public-aggregate-counters";

export function PublicAggregateCountersEnhancement() {
  const counters = useOptionalPublicData(fetchPublicAggregateCounters);

  return <PublicAggregateCounters counters={counters} />;
}
