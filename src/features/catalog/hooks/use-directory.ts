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
  directoryKeys,
  fetchDirectoryPage,
} from "../api/catalog-directory.api";
import type { DirectoryBrowserPageDto } from "../api/catalog-directory.contract";
import { hasDirectoryActiveFilters } from "./directory-url-state";
import type { DirectoryFilters } from "../types/catalog-directory.types";

const MAX_RETAINED_DIRECTORY_PAGES = 5;
const revokedDirectoryQueryKey = ["catalog", "directory-revoked"] as const;

type DirectoryFetcher = (
  filters: DirectoryFilters,
  signal: AbortSignal,
) => Promise<DirectoryBrowserPageDto>;

interface UseDirectoryOptions {
  filters: DirectoryFilters;
  initialPage?: DirectoryBrowserPageDto;
}

function isAuthorizationLoss(error: unknown) {
  return (
    error instanceof HttpClientError &&
    (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
  );
}

function directoryAnnouncement({
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
    return "Carregando o catálogo.";
  }

  if (isFetchingNextPage) {
    return "Carregando mais perfis.";
  }

  if (error) {
    return "Não foi possível carregar o catálogo. Tente novamente.";
  }

  if (itemCount === 0) {
    return filtered
      ? "Nenhum perfil encontrado com os filtros selecionados."
      : "Nenhum perfil disponível no momento.";
  }

  return itemCount === 1
    ? "1 perfil carregado."
    : `${itemCount} perfis carregados.`;
}

export function createUseDirectory(fetchPage: DirectoryFetcher) {
  return function useDirectoryWithFetcher({
    filters,
    initialPage,
  }: UseDirectoryOptions) {
    const queryClient = useQueryClient();
    const [isAuthorizationStale, setIsAuthorizationStale] = useState(false);
    const initialPageParam = filters.cursor ?? null;
    const initialData:
      InfiniteData<DirectoryBrowserPageDto, string | null> | undefined =
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
      maxPages: MAX_RETAINED_DIRECTORY_PAGES,
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
        ? revokedDirectoryQueryKey
        : directoryKeys.list(filters),
    });

    const items = useMemo(
      () => query.data?.pages.flatMap((page) => page.items) ?? [],
      [query.data],
    );
    const facets = query.data?.pages.at(-1)?.facets;

    return {
      ...query,
      announcement: directoryAnnouncement({
        accessRevoked: isAuthorizationStale,
        error: query.isError,
        filtered: hasDirectoryActiveFilters(filters),
        isFetchingNextPage: query.isFetchingNextPage,
        isPending: query.isPending,
        itemCount: items.length,
      }),
      canRetry: !isAuthorizationStale,
      facets,
      isAuthorizationStale,
      items,
    };
  };
}

export const useDirectory = createUseDirectory(fetchDirectoryPage);
