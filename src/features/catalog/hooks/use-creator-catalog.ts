"use client";

import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { HttpClientError } from "@/shared/api/http-client";

import {
  clearProtectedCatalogQueries,
  creatorCatalogKeys,
  fetchCreatorCatalogPage,
} from "../api/creator-catalog.api";
import type { CreatorCatalogBrowserPageDto } from "../api/creator-catalog.contract";
import type { CreatorCatalogFilters } from "../types/creator-catalog.types";

const MAX_RETAINED_CATALOG_PAGES = 5;
const revokedCatalogQueryKey = ["catalog", "revoked"] as const;

type CreatorCatalogFetcher = (
  filters: CreatorCatalogFilters,
  signal: AbortSignal,
) => Promise<CreatorCatalogBrowserPageDto>;

interface UseCreatorCatalogOptions {
  filters: CreatorCatalogFilters;
  initialPage?: CreatorCatalogBrowserPageDto;
}

function isAuthorizationLoss(error: unknown) {
  return (
    error instanceof HttpClientError &&
    (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
  );
}

function catalogAnnouncement({
  accessRevoked,
  error,
  filtered,
  isFetchingNextPage,
  isPending,
  itemCount,
}: {
  accessRevoked: boolean;
  error: boolean;
  filtered: boolean;
  isFetchingNextPage: boolean;
  isPending: boolean;
  itemCount: number;
}) {
  if (accessRevoked) {
    return "Seu acesso ao catálogo não está mais disponível.";
  }

  if (isPending) {
    return "Carregando criadores.";
  }

  if (isFetchingNextPage) {
    return "Carregando mais criadores.";
  }

  if (error) {
    return "Não foi possível carregar os criadores. Tente novamente.";
  }

  if (itemCount === 0) {
    return filtered
      ? "Nenhum criador encontrado com os filtros selecionados."
      : "Nenhum criador disponível no momento.";
  }

  return itemCount === 1
    ? "1 criador carregado."
    : `${itemCount} criadores carregados.`;
}

export function createUseCreatorCatalog(fetchPage: CreatorCatalogFetcher) {
  return function useCreatorCatalogWithFetcher({
    filters,
    initialPage,
  }: UseCreatorCatalogOptions) {
    const queryClient = useQueryClient();
    const [isAuthorizationStale, setIsAuthorizationStale] = useState(false);
    const initialPageParam = filters.cursor ?? null;
    const initialData:
      InfiniteData<CreatorCatalogBrowserPageDto, string | null> | undefined =
      initialPage
        ? {
            pageParams: [initialPageParam],
            pages: [initialPage],
          }
        : undefined;

    const query = useInfiniteQuery({
      enabled: !isAuthorizationStale,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialData,
      initialPageParam,
      maxPages: MAX_RETAINED_CATALOG_PAGES,
      queryFn: async ({ pageParam, signal }) => {
        if (isAuthorizationStale) {
          throw new HttpClientError({
            code: "FORBIDDEN",
            message: "Seu acesso ao catálogo não está mais disponível.",
            status: 403,
          });
        }

        try {
          return await fetchPage(
            {
              ...filters,
              cursor: pageParam ?? undefined,
            },
            signal,
          );
        } catch (error) {
          if (isAuthorizationLoss(error)) {
            setIsAuthorizationStale(true);
            await clearProtectedCatalogQueries(queryClient);
          }

          throw error;
        }
      },
      queryKey: isAuthorizationStale
        ? revokedCatalogQueryKey
        : creatorCatalogKeys.list(filters),
    });

    const items = useMemo(
      () => query.data?.pages.flatMap((page) => page.items) ?? [],
      [query.data],
    );
    const filtered = [
      filters.city,
      filters.creatorType,
      filters.niche,
      filters.platform,
      filters.search,
      filters.state,
    ].some(Boolean);

    return {
      ...query,
      announcement: catalogAnnouncement({
        accessRevoked: isAuthorizationStale,
        error: query.isError,
        filtered,
        isFetchingNextPage: query.isFetchingNextPage,
        isPending: query.isPending,
        itemCount: items.length,
      }),
      canRetry: !isAuthorizationStale,
      isAuthorizationStale,
      items,
    };
  };
}

export const useCreatorCatalog = createUseCreatorCatalog(
  fetchCreatorCatalogPage,
);
