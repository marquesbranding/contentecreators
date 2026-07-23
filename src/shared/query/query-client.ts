import { QueryClient } from "@tanstack/react-query";

import { HttpClientError } from "@/shared/api/http-client";

const DEFAULT_STALE_TIME_MS = 30_000;
const DEFAULT_GARBAGE_COLLECTION_TIME_MS = 5 * 60_000;
const MAX_TRANSIENT_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown) {
  if (
    error instanceof HttpClientError &&
    (error.code === "UNAUTHORIZED" ||
      error.code === "FORBIDDEN" ||
      error.code === "VALIDATION_ERROR" ||
      error.code === "CANCELED")
  ) {
    return false;
  }

  return failureCount < MAX_TRANSIENT_RETRIES;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: DEFAULT_GARBAGE_COLLECTION_TIME_MS,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        staleTime: DEFAULT_STALE_TIME_MS,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

type QueryFilters = Readonly<Record<string, unknown>>;

export function defineQueryKeys<const Scope extends string>(scope: Scope) {
  const all = [scope] as const;

  return {
    all,
    detail: (id: string) => [...all, "detail", id] as const,
    details: () => [...all, "detail"] as const,
    list: (filters: QueryFilters) => [...all, "list", filters] as const,
    lists: () => [...all, "list"] as const,
  };
}
