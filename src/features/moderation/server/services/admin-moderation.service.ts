import "server-only";

import type { AccountStatus } from "../../domain/moderation-policy";
import {
  adminModerationCommandSchema,
  type AdminModerationAction,
  type AdminModerationCommand,
} from "../../schemas/admin-moderation-command-schema";

export interface AdminModerationTransition {
  accountId: string;
  accountVersion: number;
  action: AdminModerationAction;
  authEffectId: string | null;
  authUserId: string;
  eventId: string;
  kind: "already_applied" | "applied";
  outboxId: string | null;
  profileVersion: number;
  status: AccountStatus;
}

export interface AdminModerationDependencies {
  applyTransition(
    command: AdminModerationCommand,
  ): Promise<AdminModerationTransition>;
  attemptEmailDelivery?(input: {
    outboxId: string;
    workerId: string;
  }): Promise<unknown>;
  invalidateEligibility(accountId: string): Promise<void> | void;
  markAuthEffectFailed(input: {
    effectId: string;
    errorCategory: "SUPABASE_AUTH";
    requestId: string;
  }): Promise<void>;
  markAuthEffectSynced(input: {
    effectId: string;
    requestId: string;
  }): Promise<void>;
  resolveRetryableAuthEffect(input: {
    effectId: string;
    requestId: string;
  }): Promise<{
    action: "BAN" | "UNBAN";
    authUserId: string;
    effectId: string;
  } | null>;
  syncAuthIdentity(input: {
    action: "BAN" | "UNBAN";
    authUserId: string;
  }): Promise<boolean>;
}

async function synchronizeAuthEffect(
  dependencies: AdminModerationDependencies,
  input: {
    action: "BAN" | "UNBAN";
    authUserId: string;
    effectId: string;
    requestId: string;
  },
) {
  const synced = await dependencies
    .syncAuthIdentity({
      action: input.action,
      authUserId: input.authUserId,
    })
    .catch(() => false);

  if (synced) {
    await dependencies.markAuthEffectSynced({
      effectId: input.effectId,
      requestId: `${input.requestId}:auth-effect-synced`,
    });

    return { kind: "synced" as const };
  }

  await dependencies.markAuthEffectFailed({
    effectId: input.effectId,
    errorCategory: "SUPABASE_AUTH",
    requestId: `${input.requestId}:auth-effect-failed`,
  });

  return { kind: "retry_pending" as const };
}

export function createAdminModerationService(
  dependencies: AdminModerationDependencies,
) {
  return {
    async apply(input: AdminModerationCommand) {
      const command = adminModerationCommandSchema.parse(input);
      const transition = await dependencies.applyTransition(command);

      await dependencies.invalidateEligibility(transition.accountId);

      if (
        transition.kind === "applied" &&
        transition.outboxId &&
        dependencies.attemptEmailDelivery
      ) {
        await dependencies
          .attemptEmailDelivery({
            outboxId: transition.outboxId,
            workerId: `moderation:${crypto.randomUUID()}`,
          })
          .catch(() => undefined);
      }

      if (
        !transition.authEffectId ||
        (transition.action !== "BAN" && transition.action !== "UNBAN")
      ) {
        return {
          ...transition,
          authEffectStatus: "not_required" as const,
        };
      }

      const authEffect = await synchronizeAuthEffect(dependencies, {
        action: transition.action,
        authUserId: transition.authUserId,
        effectId: transition.authEffectId,
        requestId: command.requestId,
      });

      return {
        ...transition,
        authEffectStatus: authEffect.kind,
      };
    },

    async retryAuthEffect(input: { effectId: string; requestId: string }) {
      const effect = await dependencies.resolveRetryableAuthEffect(input);

      return effect
        ? synchronizeAuthEffect(dependencies, {
            ...effect,
            requestId: input.requestId,
          })
        : { kind: "not_retryable" as const };
    },
  };
}
