"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { auditHistoryKeys, fetchAuditHistory } from "../api/audit-history.api";
import {
  auditHistoryFiltersSchema,
  type AuditHistoryFiltersInput,
} from "../schemas/audit-history.schema";
import type {
  AuditHistoryFilters,
  AuditHistoryResponseDto,
} from "../types/audit-history.types";

type AuditHistoryFetcher = (
  filters: AuditHistoryFilters,
  signal: AbortSignal,
) => Promise<AuditHistoryResponseDto>;

export function createUseAuditHistory(fetchHistory: AuditHistoryFetcher) {
  return function useAuditHistoryWithFetcher(input: AuditHistoryFiltersInput) {
    const filters = auditHistoryFiltersSchema.parse(input);

    return useQuery({
      placeholderData: keepPreviousData,
      queryFn: ({ signal }) => fetchHistory(filters, signal),
      queryKey: auditHistoryKeys.list(filters),
    });
  };
}

export const useAuditHistory = createUseAuditHistory(fetchAuditHistory);
