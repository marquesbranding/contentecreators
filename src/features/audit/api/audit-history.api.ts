import type { AxiosInstance } from "axios";

import { httpClient } from "@/shared/api/http-client";

import {
  auditHistoryFiltersSchema,
  auditHistoryResponseSchema,
  serializeAuditHistoryFilters,
  type AuditHistoryFiltersInput,
} from "../schemas/audit-history.schema";
import type {
  AuditHistoryFilters,
  AuditHistoryResponseDto,
} from "../types/audit-history.types";

const all = ["backoffice", "audit", "history"] as const;

export const auditHistoryKeys = {
  all,
  list(input: AuditHistoryFiltersInput) {
    const filters = auditHistoryFiltersSchema.parse(input);

    return [...all, "list", filters] as const;
  },
  lists() {
    return [...all, "list"] as const;
  },
};

export async function fetchAuditHistory(
  input: AuditHistoryFiltersInput,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<AuditHistoryResponseDto> {
  const filters: AuditHistoryFilters = auditHistoryFiltersSchema.parse(input);
  const searchParams = serializeAuditHistoryFilters(filters);
  const response = await client.get<unknown>(
    `/backoffice/audit?${searchParams.toString()}`,
    { signal },
  );

  return auditHistoryResponseSchema.parse(response.data);
}
