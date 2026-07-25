import { describe, expect, it, vi } from "vitest";

import {
  createAdminModerationService,
  type AdminModerationTransition,
} from "./admin-moderation.service";

const transition: AdminModerationTransition = {
  accountId: "b0000000-0000-4000-8000-000000000004",
  accountVersion: 4,
  action: "BAN",
  authEffectId: "ef000000-0000-4000-8000-000000000001",
  authUserId: "20000000-0000-4000-8000-000000000004",
  eventId: "f4000000-0000-4000-8000-000000000004",
  kind: "applied",
  profileVersion: 2,
  status: "BANNED",
};

function createDependencies(
  options: {
    syncResult?: boolean;
    transition?: AdminModerationTransition;
  } = {},
) {
  return {
    applyTransition: vi.fn(async () => options.transition ?? transition),
    invalidateEligibility: vi.fn(async () => undefined),
    markAuthEffectFailed: vi.fn(async () => undefined),
    markAuthEffectSynced: vi.fn(async () => undefined),
    resolveRetryableAuthEffect: vi.fn(async () => ({
      action: "UNBAN" as const,
      authUserId: transition.authUserId,
      effectId: transition.authEffectId!,
    })),
    syncAuthIdentity: vi.fn(async () => options.syncResult ?? true),
  };
}

describe("admin moderation service", () => {
  it("invalidates eligibility after the committed transition and synchronizes the Auth ban", async () => {
    const dependencies = createDependencies();
    const service = createAdminModerationService(dependencies);

    await expect(
      service.apply({
        accountId: transition.accountId,
        action: "BAN",
        expectedAccountVersion: 3,
        expectedProfileVersion: 2,
        idempotencyKey: "moderation:ban:creator-approved",
        reason: "Violação confirmada dos termos da plataforma.",
        requestId: "request-ban",
      }),
    ).resolves.toEqual({
      ...transition,
      authEffectStatus: "synced",
    });

    expect(dependencies.applyTransition).toHaveBeenCalledOnce();
    expect(dependencies.invalidateEligibility).toHaveBeenCalledWith(
      transition.accountId,
    );
    expect(dependencies.syncAuthIdentity).toHaveBeenCalledWith({
      action: "BAN",
      authUserId: transition.authUserId,
    });
    expect(dependencies.markAuthEffectSynced).toHaveBeenCalledWith({
      effectId: transition.authEffectId,
      requestId: "request-ban:auth-effect-synced",
    });
    expect(
      dependencies.applyTransition.mock.invocationCallOrder[0],
    ).toBeLessThan(
      dependencies.invalidateEligibility.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("keeps the business transition committed and records a retryable Auth failure", async () => {
    const dependencies = createDependencies({ syncResult: false });
    const service = createAdminModerationService(dependencies);

    await expect(
      service.apply({
        accountId: transition.accountId,
        action: "BAN",
        expectedAccountVersion: 3,
        expectedProfileVersion: 2,
        idempotencyKey: "moderation:ban:provider-failure",
        reason: "Violação confirmada dos termos da plataforma.",
        requestId: "request-ban-failure",
      }),
    ).resolves.toEqual({
      ...transition,
      authEffectStatus: "retry_pending",
    });

    expect(dependencies.markAuthEffectFailed).toHaveBeenCalledWith({
      effectId: transition.authEffectId,
      errorCategory: "SUPABASE_AUTH",
      requestId: "request-ban-failure:auth-effect-failed",
    });
  });

  it("does not call Auth for transitions without an operational identity effect", async () => {
    const approvedTransition: AdminModerationTransition = {
      ...transition,
      action: "APPROVE",
      authEffectId: null,
      kind: "already_applied",
      status: "APPROVED",
    };
    const dependencies = createDependencies({
      transition: approvedTransition,
    });
    const service = createAdminModerationService(dependencies);

    await expect(
      service.apply({
        accountId: approvedTransition.accountId,
        action: "APPROVE",
        expectedAccountVersion: 3,
        expectedProfileVersion: 2,
        idempotencyKey: "moderation:approve:creator-pending",
        reason: null,
        requestId: "request-approve",
      }),
    ).resolves.toEqual({
      ...approvedTransition,
      authEffectStatus: "not_required",
    });

    expect(dependencies.syncAuthIdentity).not.toHaveBeenCalled();
    expect(dependencies.invalidateEligibility).toHaveBeenCalledOnce();
  });

  it.each([
    "APPROVE",
    "REQUEST_CHANGES",
    "SUSPEND",
    "RESTORE",
    "BAN",
    "UNBAN",
    "ARCHIVE",
  ] as const)(
    "invalidates eligibility after every %s transition",
    async (action) => {
      const authEffectRequired = action === "BAN" || action === "UNBAN";
      const actionTransition: AdminModerationTransition = {
        ...transition,
        action,
        authEffectId: authEffectRequired ? transition.authEffectId : null,
        status: action === "BAN" ? "BANNED" : "APPROVED",
      };
      const dependencies = createDependencies({
        transition: actionTransition,
      });
      const service = createAdminModerationService(dependencies);

      await service.apply({
        accountId: actionTransition.accountId,
        action,
        expectedAccountVersion: 3,
        expectedProfileVersion: 2,
        idempotencyKey: `moderation:${action.toLowerCase()}:invalidation`,
        reason:
          action === "APPROVE"
            ? null
            : "Motivo administrativo para validar a invalidação.",
        requestId: `request-${action.toLowerCase()}-invalidation`,
      });

      expect(dependencies.invalidateEligibility).toHaveBeenCalledOnce();
      expect(dependencies.invalidateEligibility).toHaveBeenCalledWith(
        actionTransition.accountId,
      );
    },
  );

  it("retries a persisted failed Auth effect without replaying the moderation transition", async () => {
    const dependencies = createDependencies();
    const service = createAdminModerationService(dependencies);

    await expect(
      service.retryAuthEffect({
        effectId: transition.authEffectId!,
        requestId: "request-unban-retry",
      }),
    ).resolves.toEqual({
      kind: "synced",
    });

    expect(dependencies.applyTransition).not.toHaveBeenCalled();
    expect(dependencies.resolveRetryableAuthEffect).toHaveBeenCalledWith({
      effectId: transition.authEffectId,
      requestId: "request-unban-retry",
    });
    expect(dependencies.syncAuthIdentity).toHaveBeenCalledWith({
      action: "UNBAN",
      authUserId: transition.authUserId,
    });
    expect(dependencies.markAuthEffectSynced).toHaveBeenCalledWith({
      effectId: transition.authEffectId,
      requestId: "request-unban-retry:auth-effect-synced",
    });
  });
});
