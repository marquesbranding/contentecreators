import type { PublicAggregateCountersDto } from "../types/public-aggregate-counters.types";

const allowedCounterKeys = new Set(["approvedCompanies", "approvedCreators"]);

function isMeaningfulCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function parsePublicAggregateCounters(
  value: unknown,
): PublicAggregateCountersDto | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowedCounterKeys.has(key))
  ) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const counters: PublicAggregateCountersDto = {
    approvedCompanies: isMeaningfulCount(input.approvedCompanies)
      ? input.approvedCompanies
      : undefined,
    approvedCreators: isMeaningfulCount(input.approvedCreators)
      ? input.approvedCreators
      : undefined,
  };

  return counters.approvedCompanies || counters.approvedCreators
    ? counters
    : null;
}

type PublicRequest = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "json" | "ok">>;

export async function fetchPublicAggregateCounters(
  signal: AbortSignal,
  request: PublicRequest = fetch,
): Promise<PublicAggregateCountersDto | null> {
  try {
    const response = await request("/api/public/marketing/counters", {
      credentials: "omit",
      signal,
    });

    if (!response.ok) {
      return null;
    }

    return parsePublicAggregateCounters(await response.json());
  } catch {
    return null;
  }
}
