"use client";

import { useQuery } from "@tanstack/react-query";

import {
  catalogDetailKeys,
  fetchCatalogDetail,
} from "../api/catalog-detail.api";
import type { CatalogCreatorDetailViewDto } from "../types/catalog-detail-view.types";

type CatalogDetailFetcher = (
  creatorId: string,
  signal: AbortSignal,
) => Promise<CatalogCreatorDetailViewDto | null>;

export function createUseCatalogDetail(fetchDetail: CatalogDetailFetcher) {
  return function useCatalogDetailWithFetcher(
    creatorId: string,
    initialData?: CatalogCreatorDetailViewDto | null,
    enabled = true,
  ) {
    return useQuery({
      enabled,
      initialData,
      queryFn: ({ signal }) => fetchDetail(creatorId, signal),
      queryKey: catalogDetailKeys.detail(creatorId),
      staleTime: 0,
    });
  };
}

export const useCatalogDetail = createUseCatalogDetail(fetchCatalogDetail);
