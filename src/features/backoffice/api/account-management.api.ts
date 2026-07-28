import type { AxiosInstance } from "axios";

import { httpClient } from "@/shared/api/http-client";

import {
  accountManagementFiltersSchema,
  accountManagementResponseSchema,
  serializeAccountManagementFilters,
  type AccountManagementFiltersInput,
} from "../schemas/account-management.schema";
import type {
  AccountManagementFilters,
  AccountManagementResponseDto,
} from "../types/account-management.types";

const all = ["backoffice", "accounts"] as const;

export const accountManagementKeys = {
  all,
  detail(accountId: string) {
    return [...all, "detail", accountId] as const;
  },
  list(input: AccountManagementFiltersInput) {
    const filters = accountManagementFiltersSchema.parse(input);
    return [...all, "list", filters] as const;
  },
  lists() {
    return [...all, "list"] as const;
  },
};

export async function fetchManagedAccounts(
  input: AccountManagementFiltersInput,
  signal: AbortSignal,
  client: AxiosInstance = httpClient,
): Promise<AccountManagementResponseDto> {
  const filters: AccountManagementFilters =
    accountManagementFiltersSchema.parse(input);
  const searchParams = serializeAccountManagementFilters(filters);
  const response = await client.get<unknown>(
    `/backoffice/accounts?${searchParams.toString()}`,
    { signal },
  );

  return accountManagementResponseSchema.parse(response.data);
}
