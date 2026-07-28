"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  CREATOR_CATALOG_DEFAULT_PAGE_SIZE,
  creatorCatalogFiltersSchema,
  serializeCreatorCatalogFilters,
} from "../schemas/creator-catalog.schema";
import type { CreatorCatalogFilters } from "../types/creator-catalog.types";

const filterKeys = [
  "search",
  "niche",
  "platform",
  "city",
  "state",
  "creatorType",
  "pageSize",
] as const;

const urlKeys = [...filterKeys, "cursor"] as const;

export type CreatorCatalogUrlPatch = Partial<CreatorCatalogFilters>;

function catalogEntries(searchParams: URLSearchParams) {
  return Object.fromEntries(
    urlKeys.flatMap((key) => {
      const value = searchParams.get(key);

      return value === null ? [] : [[key, value] as const];
    }),
  );
}

export function readCreatorCatalogUrlState(
  searchParams: URLSearchParams,
): CreatorCatalogFilters {
  return creatorCatalogFiltersSchema.parse(catalogEntries(searchParams));
}

function comparableFilters(filters: CreatorCatalogFilters) {
  return filterKeys.map((key) => filters[key] ?? null);
}

export function createCreatorCatalogUrlSearchParams(
  currentSearchParams: URLSearchParams,
  patch: CreatorCatalogUrlPatch | "clear",
) {
  if (patch === "clear") {
    return serializeCreatorCatalogFilters({
      pageSize: CREATOR_CATALOG_DEFAULT_PAGE_SIZE,
    });
  }

  const current = readCreatorCatalogUrlState(currentSearchParams);
  const filterPatch = { ...patch };
  delete filterPatch.cursor;
  const next = creatorCatalogFiltersSchema.parse({
    ...current,
    ...filterPatch,
  });
  const filtersChanged =
    JSON.stringify(comparableFilters(current)) !==
    JSON.stringify(comparableFilters(next));

  return serializeCreatorCatalogFilters({
    ...next,
    cursor: filtersChanged ? undefined : current.cursor,
  });
}

export function hasCreatorCatalogActiveFilters(filters: CreatorCatalogFilters) {
  return filterKeys.some(
    (key) =>
      key !== "pageSize" && filters[key] !== undefined && filters[key] !== "",
  );
}

export function useCreatorCatalogUrlState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const filters = useMemo(
    () =>
      readCreatorCatalogUrlState(new URLSearchParams(serializedSearchParams)),
    [serializedSearchParams],
  );

  const updateFilters = useCallback(
    (patch: CreatorCatalogUrlPatch | "clear") => {
      const next = createCreatorCatalogUrlSearchParams(
        new URLSearchParams(serializedSearchParams),
        patch,
      );
      const query = next.toString();

      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, serializedSearchParams],
  );

  return {
    clearFilters: useCallback(() => updateFilters("clear"), [updateFilters]),
    filters,
    hasActiveFilters: hasCreatorCatalogActiveFilters(filters),
    updateFilters,
  };
}
