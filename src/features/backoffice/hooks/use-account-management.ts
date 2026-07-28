"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  accountManagementKeys,
  fetchManagedAccounts,
} from "../api/account-management.api";
import {
  accountManagementFiltersSchema,
  type AccountManagementFiltersInput,
} from "../schemas/account-management.schema";
import type {
  AccountManagementFilters,
  AccountManagementResponseDto,
} from "../types/account-management.types";

type AccountManagementFetcher = (
  filters: AccountManagementFilters,
  signal: AbortSignal,
) => Promise<AccountManagementResponseDto>;

export function createUseAccountManagement(
  fetchAccounts: AccountManagementFetcher,
) {
  return function useAccountManagementWithFetcher(
    input: AccountManagementFiltersInput,
  ) {
    const filters = accountManagementFiltersSchema.parse(input);

    return useQuery({
      placeholderData: keepPreviousData,
      queryFn: ({ signal }) => fetchAccounts(filters, signal),
      queryKey: accountManagementKeys.list(filters),
    });
  };
}

export const useAccountManagement =
  createUseAccountManagement(fetchManagedAccounts);
