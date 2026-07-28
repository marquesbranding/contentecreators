"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  backofficeAnalyticsKeys,
  fetchBackofficeAnalytics,
} from "../api/backoffice-analytics.api";
import { backofficeAnalyticsFiltersSchema } from "../schemas/backoffice-analytics.schema";
import type {
  BackofficeAnalyticsFilters,
  BackofficeAnalyticsFiltersInput,
  BackofficeAnalyticsResponseDto,
} from "../types/backoffice-analytics.types";

type BackofficeAnalyticsFetcher = (
  filters: BackofficeAnalyticsFilters,
  signal: AbortSignal,
) => Promise<BackofficeAnalyticsResponseDto>;

export function createUseBackofficeAnalytics(
  fetchAnalytics: BackofficeAnalyticsFetcher,
) {
  return function useBackofficeAnalyticsWithFetcher(
    input: BackofficeAnalyticsFiltersInput,
  ) {
    const filters = backofficeAnalyticsFiltersSchema.parse(input);

    return useQuery({
      placeholderData: keepPreviousData,
      queryFn: ({ signal }) => fetchAnalytics(filters, signal),
      queryKey: backofficeAnalyticsKeys.summary(filters),
    });
  };
}

export const useBackofficeAnalytics = createUseBackofficeAnalytics(
  fetchBackofficeAnalytics,
);
