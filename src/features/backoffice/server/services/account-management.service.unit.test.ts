import { describe, expect, it, vi } from "vitest";

import type { VerifiedAccountTransactionRunner } from "@/features/identity/server";

import type { AccountManagementFilters } from "../../types/account-management.types";
import { createAccountManagementService } from "./account-management.service";

const filters: AccountManagementFilters = {
  archive: "ACTIVE",
  order: "NEWEST",
  page: 1,
  pageSize: 20,
  role: undefined,
  search: "",
  status: undefined,
};

describe("account management service", () => {
  it("authorizes the current admin before listing accounts", async () => {
    const list = vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    const runVerifiedAccountTransaction = vi.fn(
      async (
        _options: unknown,
        callback: Parameters<VerifiedAccountTransactionRunner>[1],
      ) =>
        callback({} as never, {
          accountId: "a0000000-0000-4000-8000-000000000001",
          authUserId: "10000000-0000-4000-8000-000000000001",
          role: "ADMIN",
          status: "APPROVED",
        }),
    ) as unknown as VerifiedAccountTransactionRunner;
    const service = createAccountManagementService({
      list,
      runVerifiedAccountTransaction,
    });

    await service.list(filters, "request-id");

    expect(list).toHaveBeenCalledWith(expect.anything(), filters);
  });

  it("denies non-admin reads before querying", async () => {
    const list = vi.fn();
    const runVerifiedAccountTransaction = vi.fn(
      async (
        _options: unknown,
        callback: Parameters<VerifiedAccountTransactionRunner>[1],
      ) =>
        callback({} as never, {
          accountId: "b0000000-0000-4000-8000-000000000004",
          authUserId: "20000000-0000-4000-8000-000000000004",
          role: "INFLUENCER",
          status: "APPROVED",
        }),
    ) as unknown as VerifiedAccountTransactionRunner;
    const service = createAccountManagementService({
      list,
      runVerifiedAccountTransaction,
    });

    await expect(service.list(filters, "request-id")).rejects.toMatchObject({
      code: "ROLE_FORBIDDEN",
    });
    expect(list).not.toHaveBeenCalled();
  });
});
