"use client";

import { useQuery } from "@tanstack/react-query";

import {
  companyCarouselKeys,
  fetchCompanyCarousel,
  type CompanyCarouselQueryFilters,
} from "../api/company-carousel.api";
import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";

type CompanyCarouselFetcher = (
  limit: number,
  signal: AbortSignal,
  filters?: CompanyCarouselQueryFilters,
) => Promise<CompanyCarouselViewResponseDto>;

const HYDRATED_CAROUSEL_STALE_TIME_MS = 30_000;

export function createUseCompanyCarousel(
  fetchCarousel: CompanyCarouselFetcher,
) {
  return function useCompanyCarouselWithFetcher(
    limit: number,
    initialData?: CompanyCarouselViewResponseDto,
    filters: CompanyCarouselQueryFilters = {},
  ) {
    return useQuery({
      // Filtered queries are fresh state, not the server-hydrated first page.
      initialData: filters.search || filters.segment ? undefined : initialData,
      queryFn: ({ signal }) => fetchCarousel(limit, signal, filters),
      queryKey: companyCarouselKeys.list(limit, filters),
      staleTime: HYDRATED_CAROUSEL_STALE_TIME_MS,
    });
  };
}

export const useCompanyCarousel =
  createUseCompanyCarousel(fetchCompanyCarousel);
