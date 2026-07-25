import type { ApplicationTransaction } from "@/db/client";
import { AccountAccessError } from "@/features/identity/server";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";
import { describe, expect, it, vi } from "vitest";

import { createDrizzleAdminEmailRetryRepository } from "./drizzle-admin-email-retry.repository";

const command = {
  outboxId: "99999999-9999-4999-8999-999999999999",
  reason: "Reenvio autorizado pela operação",
  requestId: "admin-email-retry",
};

function createRunner(
  actor: VerifiedAccountContext,
  result: {
    outbox_id: string | null;
    result_kind: string;
  },
) {
  const execute = vi
    .fn()
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([result]);
  const runVerifiedTransaction: VerifiedAccountTransactionRunner = async (
    _input,
    work,
  ) =>
    work(
      {
        execute,
      } as unknown as ApplicationTransaction,
      actor,
    );

  return { execute, runVerifiedTransaction };
}

describe("Drizzle admin email retry repository", () => {
  const approvedAdmin: VerifiedAccountContext = {
    accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    authUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    role: "ADMIN",
    status: "APPROVED",
  };

  it("schedules one additional attempt for a terminal message", async () => {
    const { execute, runVerifiedTransaction } = createRunner(approvedAdmin, {
      outbox_id: command.outboxId,
      result_kind: "SCHEDULED",
    });
    const repository = createDrizzleAdminEmailRetryRepository({
      runVerifiedTransaction,
    });

    await expect(repository.scheduleRetry(command)).resolves.toEqual({
      kind: "scheduled",
      outboxId: command.outboxId,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["ALREADY_SCHEDULED", "already_scheduled"],
    ["ALREADY_SENT", "already_sent"],
    ["NOT_FOUND", "not_found"],
    ["NOT_RETRYABLE", "not_retryable"],
  ] as const)("maps %s without creating another message", async (row, kind) => {
    const { runVerifiedTransaction } = createRunner(approvedAdmin, {
      outbox_id: command.outboxId,
      result_kind: row,
    });
    const repository = createDrizzleAdminEmailRetryRepository({
      runVerifiedTransaction,
    });

    await expect(repository.scheduleRetry(command)).resolves.toEqual({
      kind,
    });
  });

  it.each([
    { role: "COMPANY" as const, status: "APPROVED" as const },
    { role: "ADMIN" as const, status: "SUSPENDED" as const },
  ])("rejects a non-current administrator before any write", async (access) => {
    const { execute, runVerifiedTransaction } = createRunner(
      {
        ...approvedAdmin,
        ...access,
      },
      {
        outbox_id: command.outboxId,
        result_kind: "SCHEDULED",
      },
    );
    const repository = createDrizzleAdminEmailRetryRepository({
      runVerifiedTransaction,
    });

    await expect(repository.scheduleRetry(command)).rejects.toBeInstanceOf(
      AccountAccessError,
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
