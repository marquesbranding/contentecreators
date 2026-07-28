import type { AxiosInstance } from "axios";

import { httpClient } from "@/shared/api/http-client";

import {
  backofficeAnalyticsFiltersSchema,
  backofficeAnalyticsResponseSchema,
  serializeBackofficeAnalyticsFilters,
} from "../schemas/backoffice-analytics.schema";
import type {
  BackofficeAnalyticsFiltersInput,
  BackofficeAnalyticsResponseDto,
} from "../types/backoffice-analytics.types";

const all = ["backoffice", "analytics"] as const;

export const backofficeAnalyticsKeys = {
  all,
  summary(input: BackofficeAnalyticsFiltersInput) {
    const filters = backofficeAnalyticsFiltersSchema.parse(input);
    return [...all, "summary", filters] as const;
  },
};

export async function fetchBackofficeAnalytics(
  input: BackofficeAnalyticsFiltersInput,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<BackofficeAnalyticsResponseDto> {
  const filters = backofficeAnalyticsFiltersSchema.parse(input);
  const searchParams = serializeBackofficeAnalyticsFilters(filters);
  const response = await client.get<unknown>(
    `/backoffice/analytics?${searchParams.toString()}`,
    { signal },
  );

  return backofficeAnalyticsResponseSchema.parse(response.data);
}
