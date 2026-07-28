import type { AxiosInstance } from "axios";

import { httpClient } from "@/shared/api/http-client";

import {
  adminEmailOutboxDetailSchema,
  adminEmailOutboxFiltersSchema,
  adminEmailOutboxIdSchema,
  adminEmailOutboxListSchema,
  serializeAdminEmailOutboxFilters,
  type AdminEmailOutboxFiltersInput,
} from "../schemas/admin-email-outbox.schema";
import type {
  AdminEmailOutboxDetailDto,
  AdminEmailOutboxFilters,
  AdminEmailOutboxListDto,
} from "../types/admin-email-outbox.types";

const all = ["backoffice", "emails", "outbox"] as const;

export const adminEmailOutboxKeys = {
  all,
  detail(outboxId: string) {
    return [
      ...all,
      "detail",
      adminEmailOutboxIdSchema.parse(outboxId),
    ] as const;
  },
  details() {
    return [...all, "detail"] as const;
  },
  list(input: AdminEmailOutboxFiltersInput) {
    const filters = adminEmailOutboxFiltersSchema.parse(input);

    return [...all, "list", filters] as const;
  },
  lists() {
    return [...all, "list"] as const;
  },
};

export async function fetchAdminEmailOutboxList(
  input: AdminEmailOutboxFiltersInput,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<AdminEmailOutboxListDto> {
  const filters: AdminEmailOutboxFilters =
    adminEmailOutboxFiltersSchema.parse(input);
  const searchParams = serializeAdminEmailOutboxFilters(filters);
  const response = await client.get<unknown>(
    `/backoffice/emails?${searchParams.toString()}`,
    { signal },
  );

  return adminEmailOutboxListSchema.parse(response.data);
}

export async function fetchAdminEmailOutboxDetail(
  outboxIdInput: string,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<AdminEmailOutboxDetailDto> {
  const outboxId = adminEmailOutboxIdSchema.parse(outboxIdInput);
  const response = await client.get<unknown>(`/backoffice/emails/${outboxId}`, {
    signal,
  });

  return adminEmailOutboxDetailSchema.parse(response.data);
}
