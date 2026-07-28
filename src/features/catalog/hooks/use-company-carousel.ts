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
      staleTime: 0,
    });
  };
}

export const useCompanyCarousel =
  createUseCompanyCarousel(fetchCompanyCarousel);
