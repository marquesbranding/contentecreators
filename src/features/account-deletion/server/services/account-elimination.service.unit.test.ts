import { describe, expect, it, vi } from "vitest";

import {
  createAccountEliminationService,
  fingerprintCandidates,
} from "./account-elimination.service";

const now = new Date("2026-12-20T12:00:00Z");

function setup(
  overrides: {
    deleteIdentity?: boolean;
    dbError?: Error;
    due?: {
      authUserId: string;
      deletionDueAt: Date;
      id: string;
      onlyIdentityPending: boolean;
    }[];
    media?: { bucket: string; path: string }[];
    nearDeadline?: number;
    removeStorage?: boolean;
  } = {},
) {
  const repository = {
    countPendingDueBefore: vi
      .fn()
      .mockResolvedValue(overrides.nearDeadline ?? 0),
    eliminateAccountData: vi.fn().mockImplementation(async () => {
      if (overrides.dbError) {
        throw overrides.dbError;
      }
    }),
    listDueAccounts: vi.fn().mockResolvedValue(
      overrides.due ?? [
        {
          authUserId: "auth-1",
          deletionDueAt: new Date("2027-02-01T00:00:00Z"),
          id: "acc-1",
          onlyIdentityPending: false,
        },
      ],
    ),
    listMediaObjects: vi.fn().mockResolvedValue(
      overrides.media ?? [
        { bucket: "profile-media", path: "a/avatar.png" },
        { bucket: "profile-media", path: "a/cover.png" },
      ],
    ),
    markFailed: vi.fn().mockResolvedValue(undefined),
    markIdentityDeleted: vi.fn().mockResolvedValue(undefined),
    markIdentityPending: vi.fn().mockResolvedValue(undefined),
  };
  const identity = {
    deleteIdentity: vi.fn().mockResolvedValue(overrides.deleteIdentity ?? true),
    removeStorageObjects: vi
      .fn()
      .mockResolvedValue(overrides.removeStorage ?? true),
  };
  const log = vi.fn();
  const runSystemTransaction = vi.fn(
    async (_context: unknown, work: (tx: never) => Promise<unknown>) =>
      work({} as never),
  );

  return {
    identity,
    log,
    repository,
    runSystemTransaction,
    service: createAccountEliminationService({
      identity,
      log,
      now: () => now,
      repository: repository as never,
      runSystemTransaction: runSystemTransaction as never,
    }),
  };
}

const run = { batchSize: 10, requestId: "req-1" };

describe("account elimination service", () => {
  it("only reports in dry-run mode", async () => {
    const { identity, repository, service } = setup();

    const summary = await service.run({ ...run, dryRun: true });

    expect(summary).toMatchObject({
      candidates: 1,
      dryRun: true,
      eliminated: 0,
    });
    expect(identity.removeStorageObjects).not.toHaveBeenCalled();
    expect(repository.eliminateAccountData).not.toHaveBeenCalled();
    expect(identity.deleteIdentity).not.toHaveBeenCalled();
  });

  it("removes media, runs the system-audited database step and deletes the identity", async () => {
    const { identity, repository, runSystemTransaction, service } = setup();

    const summary = await service.run({ ...run, dryRun: false });

    expect(identity.removeStorageObjects).toHaveBeenCalledWith(
      "profile-media",
      ["a/avatar.png", "a/cover.png"],
    );
    expect(runSystemTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ actorType: "SYSTEM", source: "CRON" }),
      expect.any(Function),
    );
    expect(repository.eliminateAccountData).toHaveBeenCalledWith(
      expect.anything(),
      "acc-1",
    );
    expect(identity.deleteIdentity).toHaveBeenCalledWith("auth-1");
    expect(repository.markIdentityDeleted).toHaveBeenCalledWith("acc-1");
    expect(summary).toMatchObject({ eliminated: 1, failed: 0 });
  });

  it("marks the account failed and leaves the identity when Storage fails", async () => {
    const { identity, repository, service } = setup({ removeStorage: false });

    const summary = await service.run({ ...run, dryRun: false });

    expect(repository.markFailed).toHaveBeenCalledWith("acc-1", "STORAGE");
    expect(repository.eliminateAccountData).not.toHaveBeenCalled();
    expect(identity.deleteIdentity).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ eliminated: 0, failed: 1 });
  });

  it("marks sponsorship blocks distinctly and keeps the identity", async () => {
    const { identity, repository, service } = setup({
      dbError: new Error("account_elimination_blocked_by_sponsorship"),
    });

    await service.run({ ...run, dryRun: false });

    expect(repository.markFailed).toHaveBeenCalledWith("acc-1", "SPONSORSHIP");
    expect(identity.deleteIdentity).not.toHaveBeenCalled();
  });

  it("queues the identity for retry when Auth deletion fails after the database step", async () => {
    const { repository, service } = setup({ deleteIdentity: false });

    const summary = await service.run({ ...run, dryRun: false });

    expect(repository.markIdentityPending).toHaveBeenCalledWith("acc-1");
    expect(summary.eliminated).toBe(1);
  });

  it("only retries the identity for accounts already eliminated in the database", async () => {
    const { identity, repository, service } = setup({
      due: [
        {
          authUserId: "auth-9",
          deletionDueAt: new Date("2027-01-01T00:00:00Z"),
          id: "acc-9",
          onlyIdentityPending: true,
        },
      ],
    });

    const summary = await service.run({ ...run, dryRun: false });

    expect(repository.eliminateAccountData).not.toHaveBeenCalled();
    expect(identity.removeStorageObjects).not.toHaveBeenCalled();
    expect(identity.deleteIdentity).toHaveBeenCalledWith("auth-9");
    expect(summary.identitiesRetried).toBe(1);
  });

  it("raises a high-priority alert when accounts approach the legal deadline", async () => {
    const { log, service } = setup({ nearDeadline: 2 });

    const summary = await service.run({ ...run, dryRun: true });

    expect(summary.deadlineAlerts).toBe(2);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        event: "account_elimination_deadline_near",
        level: "error",
      }),
    );
  });

  it("fingerprints the candidate set without personal data and independent of order", () => {
    expect(fingerprintCandidates(["b", "a"], true)).toBe(
      fingerprintCandidates(["a", "b"], true),
    );
    expect(fingerprintCandidates(["a"], true)).not.toBe(
      fingerprintCandidates(["a"], false),
    );
  });
});
