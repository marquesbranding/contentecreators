import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  AdminEmailOutboxDetailDto,
  AdminEmailOutboxListDto,
} from "../../types/admin-email-outbox.types";
import { createAdminEmailOutboxService } from "./admin-email-outbox.service";

const filters = {
  order: "ATTENTION_FIRST" as const,
  page: 1,
  pageSize: 20,
  status: undefined,
  template: undefined,
};
const emptyList: AdminEmailOutboxListDto = {
  counts: { DEAD_LETTER: 0, FAILED: 0, PENDING: 0 },
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};
const detail: AdminEmailOutboxDetailDto = {
  attempts: [],
  item: {
    attemptCount: 5,
    createdAt: "2026-07-28T12:00:00.000Z",
    dueAt: "2026-07-28T13:00:00.000Z",
    id: "90000000-0000-4000-8000-000000000001",
    maxAttempts: 5,
    recipientReference: "Conta 00000001",
    reference: "E-mail #90000000",
    retry: { eligible: true, reason: "ELIGIBLE" },
    status: "DEAD_LETTER",
    template: "APPROVED",
    updatedAt: "2026-07-28T12:05:00.000Z",
  },
};

function runnerFor(role: "ADMIN" | "COMPANY") {
  return (async (_input, operation) =>
    operation("transaction" as never, {
      accountId: "a0000000-0000-4000-8000-000000000001",
      authUserId: "10000000-0000-4000-8000-000000000001",
      role,
      status: "APPROVED",
    })) satisfies VerifiedAccountTransactionRunner;
}

describe("admin email outbox service", () => {
  it("re-authorizes every list and detail read as ADMIN", async () => {
    const list = vi.fn(async () => emptyList);
    const findDetail = vi.fn(async () => detail);
    const service = createAdminEmailOutboxService({
      findDetail,
      list,
      runVerifiedAccountTransaction: runnerFor("ADMIN"),
    });

    await expect(service.list(filters, "list-request")).resolves.toBe(
      emptyList,
    );
    await expect(
      service.findDetail(detail.item.id, "detail-request"),
    ).resolves.toBe(detail);
    expect(list).toHaveBeenCalledOnce();
    expect(findDetail).toHaveBeenCalledOnce();
  });

  it.each(["list", "findDetail"] as const)(
    "denies a non-admin direct %s read before repository access",
    async (method) => {
      const list = vi.fn(async () => emptyList);
      const findDetail = vi.fn(async () => detail);
      const service = createAdminEmailOutboxService({
        findDetail,
        list,
        runVerifiedAccountTransaction: runnerFor("COMPANY"),
      });

      const promise =
        method === "list"
          ? service.list(filters, "denied-list")
          : service.findDetail(detail.item.id, "denied-detail");

      await expect(promise).rejects.toBeInstanceOf(AccountAccessError);
      expect(list).not.toHaveBeenCalled();
      expect(findDetail).not.toHaveBeenCalled();
    },
  );
});
