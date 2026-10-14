import { describe, expect, it, vi } from "vitest";

import { createAccountDeletionService } from "./account-deletion.service";

function setup(
  overrides: {
    reauth?: {
      email: string | null;
      hasPassword: boolean;
      lastSignInAt: string | null;
    } | null;
    removal?: { failed: number; removed: number } | Error;
    repositoryError?: Error;
    role?: "ADMIN" | "COMPANY" | "INFLUENCER";
    signOut?: boolean | Error;
  } = {},
) {
  const transaction = {} as never;
  const identity = {
    getReauthenticationContext: vi.fn().mockResolvedValue(
      overrides.reauth === undefined
        ? {
            authUserId: "auth-1",
            email: "creator@example.test",
            hasPassword: true,
            lastSignInAt: null,
          }
        : overrides.reauth,
    ),
    signOutEverywhere: vi.fn().mockImplementation(async () => {
      if (overrides.signOut instanceof Error) {
        throw overrides.signOut;
      }

      return overrides.signOut ?? true;
    }),
  };
  const repository = {
    deleteOwnAccount: vi.fn().mockImplementation(async () => {
      if (overrides.repositoryError) {
        throw overrides.repositoryError;
      }

      return {
        accountId: "acc-1",
        outboxId: "outbox-1",
        storageObjects: [{ bucket: "profile-media", path: "acc-1/a.png" }],
      };
    }),
  };
  const storage = {
    remove: vi.fn().mockImplementation(async () => {
      if (overrides.removal instanceof Error) {
        throw overrides.removal;
      }

      return overrides.removal ?? { failed: 0, removed: 1 };
    }),
  };
  const applyAuditContext = vi.fn().mockResolvedValue(undefined);
  const deliverEmail = vi.fn().mockResolvedValue(undefined);
  const log = vi.fn();
  const runVerifiedTransaction = vi.fn(
    async (
      _options: unknown,
      work: (transaction: never, context: never) => Promise<unknown>,
    ) =>
      work(transaction, {
        accountId: "acc-1",
        authUserId: "auth-1",
        role: overrides.role ?? "INFLUENCER",
        status: "APPROVED",
      } as never),
  );

  const service = createAccountDeletionService({
    applyAuditContext,
    deliverEmail,
    identity,
    log,
    repository,
    runVerifiedTransaction: runVerifiedTransaction as never,
    storage,
  });

  return {
    applyAuditContext,
    deliverEmail,
    identity,
    log,
    repository,
    runVerifiedTransaction,
    service,
    storage,
  };
}

describe("account deletion service", () => {
  it("deletes a logged-in verified account with no password, removes Storage, sends the e-mail and ends sessions without banning", async () => {
    const context = setup();

    const result = await context.service.deleteAccount({ requestId: "req-1" });

    expect(result).toEqual({ kind: "deleted" });
    expect(context.runVerifiedTransaction).toHaveBeenCalledWith(
      { preferredRole: "NON_ADMIN", requestId: "req-1" },
      expect.any(Function),
    );
    expect(context.applyAuditContext).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        actorAccountId: "acc-1",
        actorRole: "INFLUENCER",
        actorType: "USER",
        source: "APPLICATION",
      }),
    );
    expect(context.storage.remove).toHaveBeenCalledWith([
      { bucket: "profile-media", path: "acc-1/a.png" },
    ]);
    expect(context.deliverEmail).toHaveBeenCalledWith(
      expect.objectContaining({ outboxId: "outbox-1" }),
    );
    expect(context.identity.signOutEverywhere).toHaveBeenCalledTimes(1);
  });

  it("does not ask for a recent login, even for accounts without a password", async () => {
    const stale = setup({
      reauth: {
        email: "creator@example.test",
        hasPassword: false,
        lastSignInAt: "2026-10-14T08:00:00Z",
      },
    });

    expect(await stale.service.deleteAccount({ requestId: "req-1" })).toEqual({
      kind: "deleted",
    });
    expect(stale.repository.deleteOwnAccount).toHaveBeenCalledTimes(1);
  });

  it("refuses without a signed-in session before touching the database", async () => {
    const context = setup({ reauth: null });

    expect(await context.service.deleteAccount({ requestId: "req-1" })).toEqual(
      { kind: "not_available" },
    );
    expect(context.runVerifiedTransaction).not.toHaveBeenCalled();
    expect(context.repository.deleteOwnAccount).not.toHaveBeenCalled();
    expect(context.identity.signOutEverywhere).not.toHaveBeenCalled();
  });

  it("maps banned, already deleted and admin accounts to not available", async () => {
    // "account_deletion_not_available" is what the repository raises when the
    // account is already deleted (no row returned by app_delete_own_account).
    for (const marker of [
      "account_deletion_banned",
      "account_deletion_role_forbidden",
      "account_deletion_not_available",
      "account_deletion_context_required",
      "ACCOUNT_NOT_READY",
    ]) {
      const context = setup({ repositoryError: new Error(marker) });

      expect(
        await context.service.deleteAccount({ requestId: "req-1" }),
      ).toEqual({ kind: "not_available" });
      expect(context.identity.signOutEverywhere).not.toHaveBeenCalled();
      expect(context.storage.remove).not.toHaveBeenCalled();
    }

    const admin = setup({ role: "ADMIN" });

    expect(await admin.service.deleteAccount({ requestId: "req-1" })).toEqual({
      kind: "not_available",
    });
    expect(admin.repository.deleteOwnAccount).not.toHaveBeenCalled();
    expect(admin.storage.remove).not.toHaveBeenCalled();
  });

  it("propagates unexpected database errors without side effects", async () => {
    const context = setup({ repositoryError: new Error("connection reset") });

    await expect(
      context.service.deleteAccount({ requestId: "req-1" }),
    ).rejects.toThrow("connection reset");
    expect(context.identity.signOutEverywhere).not.toHaveBeenCalled();
    expect(context.deliverEmail).not.toHaveBeenCalled();
  });

  it("still completes when Storage, e-mail or session revocation fail after the commit", async () => {
    const context = setup({
      removal: new Error("storage down"),
      signOut: new Error("auth down"),
    });
    context.deliverEmail.mockRejectedValueOnce(new Error("smtp down"));

    const result = await context.service.deleteAccount({ requestId: "req-1" });

    expect(result).toEqual({ kind: "deleted" });
    expect(context.log).toHaveBeenCalledWith(
      expect.objectContaining({ event: "account_deletion_storage_deferred" }),
    );
    expect(context.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "account_deletion_session_revoke_failed",
        level: "error",
      }),
    );
  });

  it("logs objects left in the cleanup queue", async () => {
    const context = setup({ removal: { failed: 2, removed: 0 } });

    await context.service.deleteAccount({ requestId: "req-1" });

    expect(context.log).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        event: "account_deletion_storage_deferred",
      }),
    );
  });
});
