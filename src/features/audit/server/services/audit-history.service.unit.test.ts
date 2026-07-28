import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  AuditHistoryFilters,
  AuditHistoryResponseDto,
} from "../../types/audit-history.types";
import { createAuditHistoryService } from "./audit-history.service";

const filters: AuditHistoryFilters = {
  page: 1,
  pageSize: 20,
};
const response: AuditHistoryResponseDto = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  },
};

function createRunner(role: "ADMIN" | "INFLUENCER", status = "APPROVED") {
  return vi.fn(async (_context, work) =>
    work({} as never, {
      accountId: "a0000000-0000-4000-8000-000000000001",
      authUserId: "10000000-0000-4000-8000-000000000001",
      role,
      status,
    }),
  ) as unknown as VerifiedAccountTransactionRunner;
}

describe("audit history service", () => {
  it("revalidates ADMIN authorization inside every fresh read transaction", async () => {
    const runVerifiedAccountTransaction = createRunner("ADMIN");
    const list = vi.fn(async () => response);
    const service = createAuditHistoryService({
      list,
      runVerifiedAccountTransaction,
    });

    await service.list(filters, "audit-read-1");
    await service.list(filters, "audit-read-2");

    expect(runVerifiedAccountTransaction).toHaveBeenNthCalledWith(
      1,
      { requestId: "audit-read-1" },
      expect.any(Function),
    );
    expect(runVerifiedAccountTransaction).toHaveBeenNthCalledWith(
      2,
      { requestId: "audit-read-2" },
      expect.any(Function),
    );
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("denies normal users before an audit row can be queried", async () => {
    const list = vi.fn(async () => response);
    const service = createAuditHistoryService({
      list,
      runVerifiedAccountTransaction: createRunner("INFLUENCER"),
    });

    await expect(service.list(filters, "denied-audit-read")).rejects.toEqual(
      new AccountAccessError("ROLE_FORBIDDEN"),
    );
    expect(list).not.toHaveBeenCalled();
  });
});
