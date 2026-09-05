"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  DIRECTORY_DEFAULT_PAGE_SIZE,
  directoryFiltersSchema,
  parseDirectorySearchParams,
  serializeDirectoryFilters,
} from "../schemas/catalog-directory.schema";
import type { DirectoryFilters } from "../types/catalog-directory.types";

const singleValueKeys = [
  "search",
  "niche",
  "segment",
  "platform",
  "city",
  "state",
  "followersMin",
  "followersMax",
  "viewsMin",
  "viewsMax",
  "interactionsMin",
  "interactionsMax",
  "newFollowersMin",
  "newFollowersMax",
  "pageSize",
] as const;

export type DirectoryUrlPatch = Partial<DirectoryFilters>;

export function readDirectoryUrlState(
  searchParams: URLSearchParams,
): DirectoryFilters {
  return parseDirectorySearchParams(searchParams);
}

function comparableFilters(filters: DirectoryFilters) {
  return [
    ...singleValueKeys.map((key) => filters[key] ?? null),
    [...(filters.type ?? [])].sort().join(","),
  ];
}

export function createDirectoryUrlSearchParams(
  currentSearchParams: URLSearchParams,
  patch: DirectoryUrlPatch | "clear",
) {
  if (patch === "clear") {
    return serializeDirectoryFilters({
      pageSize: DIRECTORY_DEFAULT_PAGE_SIZE,
    });
  }

  const current = readDirectoryUrlState(currentSearchParams);
  const filterPatch = { ...patch };
  delete filterPatch.cursor;
  const next = directoryFiltersSchema.parse({
    ...current,
    ...filterPatch,
  });
  const filtersChanged =
    JSON.stringify(comparableFilters(current)) !==
    JSON.stringify(comparableFilters(next));

  return serializeDirectoryFilters({
    ...next,
    cursor: filtersChanged ? undefined : current.cursor,
  });
}

export function hasDirectoryActiveFilters(filters: DirectoryFilters) {
  return (
    singleValueKeys.some(
      (key) =>
        key !== "pageSize" && filters[key] !== undefined && filters[key] !== "",
    ) || Boolean(filters.type?.length)
  );
}

export function useDirectoryUrlState() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const filters = useMemo(
    () => readDirectoryUrlState(new URLSearchParams(serializedSearchParams)),
    [serializedSearchParams],
  );

  const updateFilters = useCallback(
    (patch: DirectoryUrlPatch | "clear") => {
      const next = createDirectoryUrlSearchParams(
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
    hasActiveFilters: hasDirectoryActiveFilters(filters),
    updateFilters,
  };
}
