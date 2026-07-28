import "server-only";

import type {
  ApprovedPublicCounts,
  PublicAggregateCountersDto,
} from "../../types/public-aggregate-counters.types";

interface PublicAggregateCountersServiceDependencies {
  loadApprovedCounts(): Promise<ApprovedPublicCounts>;
}

function meaningfulCount(value: number) {
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

export function createPublicAggregateCountersService({
  loadApprovedCounts,
}: PublicAggregateCountersServiceDependencies) {
  return {
    async load(): Promise<PublicAggregateCountersDto | null> {
      try {
        const counts = await loadApprovedCounts();
        const counters: PublicAggregateCountersDto = {
          approvedCompanies: meaningfulCount(counts.approvedCompanies),
          approvedCreators: meaningfulCount(counts.approvedCreators),
        };

        return counters.approvedCompanies || counters.approvedCreators
          ? counters
          : null;
      } catch {
        return null;
      }
    },
  };
}
