import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { ModerationQueueResponseDto } from "../../types/moderation-queue.types";
import { createModerationQueueService } from "./moderation-queue.service";

const filters = {
  order: "PENDING_FIRST" as const,
  page: 1,
  pageSize: 20,
  role: "INFLUENCER" as const,
  search: "",
  status: undefined,
};
const response: ModerationQueueResponseDto = {
  counts: {
    byRole: { COMPANY: 1, INFLUENCER: 1 },
    byStatus: {
      APPROVED: 0,
      BANNED: 0,
      CHANGES_REQUESTED: 0,
      PENDING_REVIEW: 1,
      SUSPENDED: 0,
    },
  },
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

function createRunner(role: "ADMIN" | "COMPANY", status = "APPROVED") {
  return vi.fn(async (_context, work) =>
    work({} as never, {
      accountId: "a0000000-0000-4000-8000-000000000001",
      authUserId: "10000000-0000-4000-8000-000000000001",
      role,
      status,
    }),
  ) as unknown as VerifiedAccountTransactionRunner;
}

describe("moderation queue service", () => {
  it("authorizes every list read inside a fresh verified transaction", async () => {
    const runVerifiedAccountTransaction = createRunner("ADMIN");
    const list = vi.fn(async () => response);
    const service = createModerationQueueService({
      list,
      runVerifiedAccountTransaction,
    });

    await service.list(filters, "request-one");
    await service.list(filters, "request-two");

    expect(runVerifiedAccountTransaction).toHaveBeenNthCalledWith(
      1,
      { requestId: "request-one" },
      expect.any(Function),
    );
    expect(runVerifiedAccountTransaction).toHaveBeenNthCalledWith(
      2,
      { requestId: "request-two" },
      expect.any(Function),
    );
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("denies a non-admin before querying queue data", async () => {
    const list = vi.fn(async () => response);
    const service = createModerationQueueService({
      list,
      runVerifiedAccountTransaction: createRunner("COMPANY"),
    });

    await expect(service.list(filters, "denied-request")).rejects.toEqual(
      new AccountAccessError("ROLE_FORBIDDEN"),
    );
    expect(list).not.toHaveBeenCalled();
  });
});
