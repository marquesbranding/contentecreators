import { describe, expect, it, vi } from "vitest";

import {
  assertExecuteAllowed,
  createAccountEliminationService,
  fingerprintCandidates,
  PRODUCTION_SUPABASE_PROJECT_REF,
} from "./account-elimination.service";

const now = new Date("2026-12-20T12:00:00Z");

function setup(
  overrides: {
    banned?: boolean;
    dbError?: Error;
    failedAccounts?: {
      authUserId: string | null;
      deletionState: "FAILED";
      id: string;
    }[];
    liftBan?: boolean;
    nearDeadline?: number;
  } = {},
) {
  const repository = {
    countPendingDueBefore: vi
      .fn()
      .mockResolvedValue(overrides.nearDeadline ?? 0),
    countStorageCleanup: vi.fn().mockResolvedValue(3),
    eliminateAccountData: vi.fn().mockImplementation(async () => {
      if (overrides.dbError) {
        throw overrides.dbError;
      }

      return [{ bucket: "profile-media", path: "acc-1/a.png" }];
    }),
    hasBannedAccount: vi.fn().mockResolvedValue(overrides.banned ?? false),
    listFailedAccounts: vi
      .fn()
      .mockResolvedValue(
        overrides.failedAccounts ?? [
          { authUserId: "auth-1", deletionState: "FAILED", id: "acc-1" },
        ],
      ),
    markFailed: vi.fn().mockResolvedValue(undefined),
  };
  const identity = {
    liftDeletionBan: vi.fn().mockResolvedValue(overrides.liftBan ?? true),
  };
  const storage = {
    drainQueue: vi.fn().mockResolvedValue({ failed: 1, removed: 2 }),
    remove: vi.fn().mockResolvedValue({ failed: 0, removed: 1 }),
  };
  const log = vi.fn();
  const runSystemTransaction = vi.fn(
    async (_context: unknown, work: (transaction: never) => Promise<unknown>) =>
      work({} as never),
  );

  const service = createAccountEliminationService({
    identity,
    log,
    now: () => now,
    repository,
    runSystemTransaction: runSystemTransaction as never,
    storage,
  });

  return { identity, log, repository, runSystemTransaction, service, storage };
}

describe("account elimination catch-up routine", () => {
  it("only reports in dry-run mode", async () => {
    const context = setup({ nearDeadline: 2 });

    const summary = await context.service.run({
      batchSize: 10,
      dryRun: true,
      requestId: "req-1",
    });

    expect(summary).toMatchObject({
      candidates: 1,
      deadlineAlerts: 2,
      dryRun: true,
      eliminated: 0,
      storageQueued: 3,
    });
    expect(context.repository.eliminateAccountData).not.toHaveBeenCalled();
    expect(context.identity.liftDeletionBan).not.toHaveBeenCalled();
    expect(context.storage.drainQueue).not.toHaveBeenCalled();
    expect(context.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "account_elimination_deadline_near",
        level: "error",
      }),
    );
  });

  it("lifts the legacy ban, erases the data as SYSTEM and drains the Storage queue", async () => {
    const context = setup();

    const summary = await context.service.run({
      batchSize: 10,
      dryRun: false,
      requestId: "req-1",
    });

    expect(context.identity.liftDeletionBan).toHaveBeenCalledWith("auth-1");
    expect(context.runSystemTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ actorType: "SYSTEM", source: "CRON" }),
      expect.any(Function),
    );
    expect(context.storage.remove).toHaveBeenCalledWith([
      { bucket: "profile-media", path: "acc-1/a.png" },
    ]);
    expect(context.storage.drainQueue).toHaveBeenCalled();
    expect(summary).toMatchObject({
      eliminated: 1,
      failed: 0,
      storageFailed: 1,
      storageRemoved: 2,
    });
    expect(context.log).toHaveBeenCalledWith(
      expect.objectContaining({ event: "account_storage_cleanup_failed" }),
    );
  });

  it("keeps the ban of a login that still owns a banned account", async () => {
    const context = setup({ banned: true });

    await context.service.run({ batchSize: 10, dryRun: false, requestId: "r" });

    expect(context.identity.liftDeletionBan).not.toHaveBeenCalled();
    expect(context.repository.eliminateAccountData).toHaveBeenCalled();
  });

  it("lifts the ban only after the erase succeeded", async () => {
    const context = setup();

    await context.service.run({ batchSize: 10, dryRun: false, requestId: "r" });

    const erased =
      context.repository.eliminateAccountData.mock.invocationCallOrder[0];
    const unbanned =
      context.identity.liftDeletionBan.mock.invocationCallOrder[0];
    expect(erased).toBeDefined();
    expect(unbanned).toBeDefined();
    expect(erased!).toBeLessThan(unbanned!);
  });

  it("does not lift the ban when the erase throws, so the login stays retryable", async () => {
    const context = setup({ dbError: new Error("boom") });

    const summary = await context.service.run({
      batchSize: 10,
      dryRun: false,
      requestId: "r",
    });

    expect(context.identity.liftDeletionBan).not.toHaveBeenCalled();
    expect(context.repository.markFailed).toHaveBeenCalledWith(
      "acc-1",
      "DATABASE",
    );
    expect(summary).toMatchObject({ eliminated: 0, failed: 1 });
  });

  it("keeps the data erased and reports the failure when the ban cannot be lifted afterwards", async () => {
    const context = setup({ liftBan: false });

    const summary = await context.service.run({
      batchSize: 10,
      dryRun: false,
      requestId: "r",
    });

    expect(context.repository.eliminateAccountData).toHaveBeenCalled();
    expect(context.storage.remove).toHaveBeenCalledWith([
      { bucket: "profile-media", path: "acc-1/a.png" },
    ]);
    expect(context.repository.markFailed).not.toHaveBeenCalledWith(
      "acc-1",
      "AUTH_UNBAN",
    );
    expect(summary).toMatchObject({ eliminated: 0, failed: 1 });
    expect(context.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "account_elimination_failed",
        failureCode: "AUTH_UNBAN",
      }),
    );
  });

  it("treats a ban lift that throws after the erase like a failed lift", async () => {
    const context = setup();
    context.identity.liftDeletionBan.mockRejectedValueOnce(
      new Error("network"),
    );

    const summary = await context.service.run({
      batchSize: 10,
      dryRun: false,
      requestId: "r",
    });

    expect(context.repository.eliminateAccountData).toHaveBeenCalled();
    expect(summary).toMatchObject({ eliminated: 0, failed: 1 });
  });

  it("marks database failures for the next run", async () => {
    const context = setup({ dbError: new Error("boom") });

    const summary = await context.service.run({
      batchSize: 10,
      dryRun: false,
      requestId: "r",
    });

    expect(context.repository.markFailed).toHaveBeenCalledWith(
      "acc-1",
      "DATABASE",
    );
    expect(summary).toMatchObject({ eliminated: 0, failed: 1 });
    expect(context.storage.remove).not.toHaveBeenCalled();
  });

  it("fingerprints the candidate set without personal data", () => {
    expect(fingerprintCandidates(["b", "a"], false)).toBe(
      fingerprintCandidates(["a", "b"], false),
    );
    expect(fingerprintCandidates(["a"], true)).not.toBe(
      fingerprintCandidates(["a"], false),
    );
  });
});

describe("legacy elimination execute gate", () => {
  const localUrl = "http://127.0.0.1:54321";
  const productionUrl = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
  const fingerprint = "f".repeat(64);
  const base = {
    appEnvironment: "local",
    candidateFingerprint: fingerprint,
    confirmedWithClient: true,
    execute: true,
    fingerprint,
    supabaseUrl: localUrl,
  };

  it("never blocks a dry run", () => {
    expect(() =>
      assertExecuteAllowed({
        ...base,
        confirmedWithClient: false,
        execute: false,
        fingerprint: undefined,
      }),
    ).not.toThrow();
  });

  it("allows an execution with the confirmation and the matching fingerprint", () => {
    expect(() => assertExecuteAllowed(base)).not.toThrow();
  });

  it("requires the confirmation outside production too", () => {
    expect(() =>
      assertExecuteAllowed({ ...base, confirmedWithClient: false }),
    ).toThrow("--execute exige --confirmed-with-client.");
  });

  it("refuses when APP_ENV says local but the URL points at production", () => {
    expect(() =>
      assertExecuteAllowed({
        ...base,
        confirmedWithClient: false,
        supabaseUrl: productionUrl,
      }),
    ).toThrow("Produção detectada");
  });

  it("refuses when APP_ENV says production, whatever the URL", () => {
    expect(() =>
      assertExecuteAllowed({
        ...base,
        appEnvironment: "production",
        confirmedWithClient: false,
      }),
    ).toThrow("Produção detectada");
  });

  it("refuses an execution without the fingerprint", () => {
    expect(() =>
      assertExecuteAllowed({ ...base, fingerprint: undefined }),
    ).toThrow("--fingerprint");
    expect(() => assertExecuteAllowed({ ...base, fingerprint: "" })).toThrow(
      "--fingerprint",
    );
  });

  it("refuses when the candidate set changed since the dry run", () => {
    expect(() =>
      assertExecuteAllowed({
        ...base,
        fingerprint: "0".repeat(64),
      }),
    ).toThrow("fingerprint diferente");
  });

  it("allows production only with the confirmation and the matching fingerprint", () => {
    expect(() =>
      assertExecuteAllowed({
        ...base,
        appEnvironment: "production",
        supabaseUrl: productionUrl,
      }),
    ).not.toThrow();
  });
});
