import { describe, expect, it, vi } from "vitest";

import { createAccountDeletionService } from "./account-deletion.service";

const now = new Date("2026-10-14T12:00:00Z");

function setup(
  overrides: {
    banResult?: boolean;
    reauth?: {
      email: string | null;
      hasPassword: boolean;
      lastSignInAt: string | null;
    } | null;
    repositoryError?: Error;
    unbanResult?: boolean;
    verifyPassword?: boolean;
  } = {},
) {
  const transaction = {} as never;
  const identity = {
    banIdentity: vi.fn().mockResolvedValue(overrides.banResult ?? true),
    getReauthenticationContext: vi.fn().mockResolvedValue(
      overrides.reauth === undefined
        ? {
            authUserId: "auth-1",
            email: "creator@example.test",
            hasPassword: true,
            lastSignInAt: null,
          }
        : overrides.reauth && { authUserId: "auth-1", ...overrides.reauth },
    ),
    signOutEverywhere: vi.fn().mockResolvedValue(undefined),
    unbanIdentity: vi.fn().mockResolvedValue(overrides.unbanResult ?? true),
    verifyPassword: vi.fn().mockResolvedValue(overrides.verifyPassword ?? true),
  };
  const repository = {
    recoverAccount: vi.fn().mockImplementation(async () => {
      if (overrides.repositoryError) {
        throw overrides.repositoryError;
      }

      return { accountId: "acc-1", authUserId: "auth-1", outboxId: "out-2" };
    }),
    requestOwnDeletion: vi.fn().mockImplementation(async () => {
      if (overrides.repositoryError) {
        throw overrides.repositoryError;
      }

      return {
        accountId: "acc-1",
        authUserId: "auth-1",
        eliminationEligibleAt: new Date("2026-11-13T12:00:00Z"),
        outboxId: "out-1",
      };
    }),
  };
  const applyAuditContext = vi.fn().mockResolvedValue(undefined);
  const deliverEmail = vi.fn().mockResolvedValue(undefined);
  const runVerifiedTransaction = vi.fn(
    async (
      _options: unknown,
      work: (tx: never, context: unknown) => Promise<unknown>,
    ) =>
      work(transaction, {
        accountId: "acc-1",
        authUserId: "auth-1",
        role: "INFLUENCER",
        status: "APPROVED",
      }),
  );
  const adminTransaction = vi.fn(
    async (
      _options: unknown,
      work: (tx: never, context: unknown) => Promise<unknown>,
    ) =>
      work(transaction, {
        accountId: "admin-1",
        authUserId: "auth-admin",
        role: "ADMIN",
        status: "APPROVED",
      }),
  );
  const service = (runner: typeof runVerifiedTransaction) =>
    createAccountDeletionService({
      applyAuditContext,
      deliverEmail,
      identity,
      now: () => now,
      repository,
      runVerifiedTransaction: runner as never,
    });

  return {
    adminService: service(adminTransaction),
    applyAuditContext,
    deliverEmail,
    identity,
    repository,
    service: service(runVerifiedTransaction),
  };
}

describe("account deletion service", () => {
  it("requires a correct password for password accounts", async () => {
    const { identity, repository, service } = setup({ verifyPassword: false });

    await expect(
      service.requestDeletion({ password: "wrong", requestId: "r1" }),
    ).resolves.toEqual({ kind: "invalid_password" });
    expect(repository.requestOwnDeletion).not.toHaveBeenCalled();
    expect(identity.banIdentity).not.toHaveBeenCalled();
  });

  it("requires a password when the account has one", async () => {
    const { service } = setup();

    await expect(service.requestDeletion({ requestId: "r1" })).resolves.toEqual(
      { kind: "invalid_password" },
    );
  });

  it("asks Google accounts to sign in again when the login is old", async () => {
    const { repository, service } = setup({
      reauth: {
        email: "creator@example.test",
        hasPassword: false,
        lastSignInAt: "2026-10-14T10:00:00Z",
      },
    });

    await expect(service.requestDeletion({ requestId: "r1" })).resolves.toEqual(
      { kind: "reauthentication_required" },
    );
    expect(repository.requestOwnDeletion).not.toHaveBeenCalled();
  });

  it("accepts a Google account with a recent login", async () => {
    const { service } = setup({
      reauth: {
        email: "creator@example.test",
        hasPassword: false,
        lastSignInAt: "2026-10-14T11:58:00Z",
      },
    });

    await expect(
      service.requestDeletion({ requestId: "r1" }),
    ).resolves.toMatchObject({ kind: "requested" });
  });

  it("records an audited request, sends the e-mail, locks the identity and signs out", async () => {
    const { applyAuditContext, deliverEmail, identity, repository, service } =
      setup();

    const result = await service.requestDeletion({
      password: "right",
      requestId: "r1",
    });

    expect(result).toEqual({
      eliminationEligibleAt: new Date("2026-11-13T12:00:00Z"),
      kind: "requested",
    });
    expect(applyAuditContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorAccountId: "acc-1",
        actorType: "USER",
        source: "APPLICATION",
      }),
    );
    expect(repository.requestOwnDeletion).toHaveBeenCalledTimes(1);
    expect(deliverEmail).toHaveBeenCalledWith(
      expect.objectContaining({ outboxId: "out-1" }),
    );
    expect(identity.banIdentity).toHaveBeenCalledWith("auth-1");
    expect(identity.signOutEverywhere).toHaveBeenCalledTimes(1);
  });

  it("still succeeds when immediate e-mail delivery fails", async () => {
    const { deliverEmail, service } = setup();
    deliverEmail.mockRejectedValue(new Error("smtp down"));

    await expect(
      service.requestDeletion({ password: "right", requestId: "r1" }),
    ).resolves.toMatchObject({ kind: "requested" });
  });

  it("fails loudly when the identity cannot be locked", async () => {
    const { identity, service } = setup({ banResult: false });

    await expect(
      service.requestDeletion({ password: "right", requestId: "r1" }),
    ).rejects.toThrow("account_deletion_identity_lock_failed");
    expect(identity.signOutEverywhere).toHaveBeenCalled();
  });

  it("maps database refusals to not available", async () => {
    const { service } = setup({
      repositoryError: new Error("account_deletion_banned"),
    });

    await expect(
      service.requestDeletion({ password: "right", requestId: "r1" }),
    ).resolves.toEqual({ kind: "not_available" });
  });

  it("recovers as an administrator, unlocks the identity and queues the e-mail", async () => {
    const { adminService, applyAuditContext, deliverEmail, identity } = setup();

    await expect(
      adminService.recoverAccount({
        accountId: "acc-1",
        reason: "Pedido do titular",
        requestId: "r2",
      }),
    ).resolves.toEqual({ accountId: "acc-1", kind: "recovered" });
    expect(applyAuditContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorType: "ADMIN",
        reason: "Pedido do titular",
        source: "BACKOFFICE",
      }),
    );
    expect(identity.unbanIdentity).toHaveBeenCalledWith("auth-1");
    expect(deliverEmail).toHaveBeenCalledWith(
      expect.objectContaining({ outboxId: "out-2" }),
    );
  });

  it("does not let non-administrators recover accounts", async () => {
    const { repository, service } = setup();

    await expect(
      service.recoverAccount({
        accountId: "acc-1",
        reason: "Pedido do titular",
        requestId: "r2",
      }),
    ).rejects.toThrow();
    expect(repository.recoverAccount).not.toHaveBeenCalled();
  });

  it("reports closed windows as not recoverable", async () => {
    const { adminService, identity } = setup({
      repositoryError: new Error("account_recovery_window_closed"),
    });

    await expect(
      adminService.recoverAccount({
        accountId: "acc-1",
        reason: "Tarde demais",
        requestId: "r2",
      }),
    ).resolves.toEqual({ kind: "not_recoverable" });
    expect(identity.unbanIdentity).not.toHaveBeenCalled();
  });
});
