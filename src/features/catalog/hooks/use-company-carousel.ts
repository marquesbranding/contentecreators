"use client";

import { useQuery } from "@tanstack/react-query";

import {
  companyCarouselKeys,
  fetchCompanyCarousel,
} from "../api/company-carousel.api";
import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";

type CompanyCarouselFetcher = (
  limit: number,
  signal: AbortSignal,
) => Promise<CompanyCarouselViewResponseDto>;

const HYDRATED_CAROUSEL_STALE_TIME_MS = 30_000;

export function createUseCompanyCarousel(
  fetchCarousel: CompanyCarouselFetcher,
) {
  return function useCompanyCarouselWithFetcher(
    limit: number,
    initialData?: CompanyCarouselViewResponseDto,
  ) {
    return useQuery({
      initialData,
      queryFn: ({ signal }) => fetchCarousel(limit, signal),
      queryKey: companyCarouselKeys.list(limit),
      // The server already authorized this payload for the first render. This
      // prevents a duplicate hydration request while staying well below the
      // five-minute signed URL lifetime.
      staleTime: HYDRATED_CAROUSEL_STALE_TIME_MS,
    });
  };
}

export const useCompanyCarousel =
  createUseCompanyCarousel(fetchCompanyCarousel);
