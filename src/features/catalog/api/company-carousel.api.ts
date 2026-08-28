import type { AxiosInstance } from "axios";

import { httpClient, HttpClientError } from "@/shared/api/http-client";

import { companyCarouselViewResponseSchema } from "../schemas/company-carousel-view.schema";
import { COMPANY_CAROUSEL_MAX_LIMIT } from "../types/company-carousel.types";
import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";

const all = ["catalog", "company-carousel"] as const;

export interface CompanyCarouselQueryFilters {
  search?: string;
  segment?: string;
}

export const companyCarouselKeys = {
  all,
  list(limit: number, filters: CompanyCarouselQueryFilters = {}) {
    return [
      ...all,
      Math.min(Math.max(limit, 1), COMPANY_CAROUSEL_MAX_LIMIT),
      filters.search ?? "",
      filters.segment ?? "",
    ] as const;
  },
};

function isEligibilityLoss(error: unknown) {
  return (
    error instanceof HttpClientError &&
    (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
  );
}

export async function fetchCompanyCarousel(
  limit: number,
  signal: AbortSignal,
  filters: CompanyCarouselQueryFilters = {},
  client: AxiosInstance = httpClient,
): Promise<CompanyCarouselViewResponseDto> {
  const boundedLimit = Math.min(
    Math.max(Math.trunc(limit), 1),
    COMPANY_CAROUSEL_MAX_LIMIT,
  );
  const searchParams = new URLSearchParams({ limit: String(boundedLimit) });

  if (filters.search) {
    searchParams.set("search", filters.search);
  }
  if (filters.segment) {
    searchParams.set("segment", filters.segment);
  }

  try {
    const response = await client.get<unknown>(
      `/catalog/companies?${searchParams.toString()}`,
      { signal },
    );

    return companyCarouselViewResponseSchema.parse(response.data);
  } catch (error) {
    if (isEligibilityLoss(error)) {
      return { items: [], limit: boundedLimit };
    }

    throw error;
  }
}

export type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";
