"use client";

import { useQuery } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { useEffect, useState } from "react";

import { createHttpClient, HttpClientError } from "@/shared/api/http-client";

import { isValidCnpj, normalizeCnpj } from "../domain/cnpj";
import type { CnpjLookupResult } from "../types/cnpj-lookup.types";

const httpClient = createHttpClient({ timeoutMs: 6_000 });

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

export type CnpjLookupUiStatus =
  | "idle"
  | "loading"
  | "success"
  | "not_found"
  | "timeout"
  | "rate_limited"
  | "unavailable";

const manualEntryStatuses = new Set<CnpjLookupUiStatus>([
  "not_found",
  "timeout",
  "rate_limited",
  "unavailable",
]);

function errorStatus(error: unknown): CnpjLookupUiStatus {
  if (!(error instanceof HttpClientError)) {
    return "unavailable";
  }

  if (error.code === "CANCELED") {
    return "idle";
  }

  if (error.code === "TIMEOUT") {
    return "timeout";
  }

  if (error.code === "RATE_LIMITED") {
    return "rate_limited";
  }

  return "unavailable";
}

function resultStatus(
  result: CnpjLookupResult | undefined,
): CnpjLookupUiStatus {
  if (!result || result.status === "invalid") {
    return "idle";
  }

  if (result.status === "malformed_response") {
    return "unavailable";
  }

  return result.status;
}

export function createUseCnpjLookup(
  client: AxiosInstance,
  { debounceMs = 450 }: { debounceMs?: number } = {},
) {
  return function useCnpjLookupWithClient(cnpj: string) {
    const normalizedCnpj = normalizeCnpj(cnpj);
    const debouncedCnpj = useDebouncedValue(normalizedCnpj, debounceMs);
    const enabled = isValidCnpj(debouncedCnpj);

    const query = useQuery({
      enabled,
      queryFn: async ({ signal }) => {
        const response = await client.get<CnpjLookupResult>(
          `/company-registry/cnpj/${debouncedCnpj}`,
          { signal },
        );
        return response.data;
      },
      queryKey: ["company-cnpj", debouncedCnpj],
      retry: false,
      staleTime: 5 * 60 * 1_000,
    });
    const lookupStatus: CnpjLookupUiStatus = !enabled
      ? "idle"
      : query.isFetching
        ? "loading"
        : query.isError
          ? errorStatus(query.error)
          : resultStatus(query.data);

    return {
      ...query,
      lookupStatus,
      manualEntryAvailable: manualEntryStatuses.has(lookupStatus),
    };
  };
}

export const useCnpjLookup = createUseCnpjLookup(httpClient);
