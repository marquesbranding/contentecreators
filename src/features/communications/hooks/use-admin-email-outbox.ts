"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  adminEmailOutboxKeys,
  fetchAdminEmailOutboxDetail,
  fetchAdminEmailOutboxList,
} from "../api/admin-email-outbox.api";
import {
  adminEmailOutboxFiltersSchema,
  type AdminEmailOutboxFiltersInput,
} from "../schemas/admin-email-outbox.schema";
import type {
  AdminEmailOutboxDetailDto,
  AdminEmailOutboxFilters,
  AdminEmailOutboxListDto,
} from "../types/admin-email-outbox.types";

type ListFetcher = (
  filters: AdminEmailOutboxFilters,
  signal: AbortSignal,
) => Promise<AdminEmailOutboxListDto>;

type DetailFetcher = (
  outboxId: string,
  signal: AbortSignal,
) => Promise<AdminEmailOutboxDetailDto>;

export function createUseAdminEmailOutboxList(fetchList: ListFetcher) {
  return function useAdminEmailOutboxListWithFetcher(
    input: AdminEmailOutboxFiltersInput,
  ) {
    const filters = adminEmailOutboxFiltersSchema.parse(input);

    return useQuery({
      placeholderData: keepPreviousData,
      queryFn: ({ signal }) => fetchList(filters, signal),
      queryKey: adminEmailOutboxKeys.list(filters),
    });
  };
}

export function createUseAdminEmailOutboxDetail(fetchDetail: DetailFetcher) {
  return function useAdminEmailOutboxDetailWithFetcher(
    outboxId: string | null,
  ) {
    return useQuery({
      enabled: outboxId !== null,
      queryFn: ({ signal }) => {
        if (!outboxId) {
          throw new Error("Email outbox detail requires an item reference.");
        }

        return fetchDetail(outboxId, signal);
      },
      queryKey: outboxId
        ? adminEmailOutboxKeys.detail(outboxId)
        : adminEmailOutboxKeys.details(),
    });
  };
}

export const useAdminEmailOutboxList = createUseAdminEmailOutboxList(
  fetchAdminEmailOutboxList,
);
export const useAdminEmailOutboxDetail = createUseAdminEmailOutboxDetail(
  fetchAdminEmailOutboxDetail,
);
