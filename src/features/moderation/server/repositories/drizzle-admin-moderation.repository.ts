import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { identityAuthEffects } from "@/db/schema";
import { applyVerifiedAuditContext } from "@/features/audit/server";
import {
  createServerVerifiedAccountTransactionRunner,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { AdminModerationCommand } from "../../schemas/admin-moderation-command-schema";
import type { AdminModerationTransition } from "../services/admin-moderation.service";

interface AdminModerationFunctionRow extends Record<string, unknown> {
  account_id: string;
  account_version: number;
  action: AdminModerationTransition["action"];
  auth_effect_id: string | null;
  auth_user_id: string;
  event_id: string;
  profile_version: number;
  result_kind: "ALREADY_APPLIED" | "APPLIED";
  status: AdminModerationTransition["status"];
}

interface AuthEffectFunctionRow extends Record<string, unknown> {
  attempt_count: number;
  effect_status: "FAILED" | "SYNCED";
}

async function applyAuditContext(
  transaction: ApplicationTransaction,
  input: {
    accountId: string;
    reason: string;
    requestId: string;
  },
) {
  await applyVerifiedAuditContext(transaction, {
    actorAccountId: input.accountId,
    actorRole: "ADMIN",
    actorType: "ADMIN",
    reason: input.reason,
    requestId: input.requestId,
    source: "BACKOFFICE",
  });
}

export function createDrizzleAdminModerationRepository({
  runVerifiedTransaction,
}: {
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}) {
  async function completeAuthEffect(input: {
    effectId: string;
    errorCategory: "SUPABASE_AUTH" | null;
    requestId: string;
    succeeded: boolean;
  }) {
    return runVerifiedTransaction(
      { requestId: input.requestId },
      async (transaction, actor) => {
        await applyAuditContext(transaction, {
          accountId: actor.accountId,
          reason: input.succeeded
            ? "Supabase Auth moderation effect synchronized"
            : "Supabase Auth moderation effect failed and remains retryable",
          requestId: input.requestId,
        });

        const [effect] = await transaction.execute<AuthEffectFunctionRow>(sql`
          select effect_status, attempt_count
          from public.app_complete_identity_auth_effect(
            ${input.effectId}::uuid,
            ${input.succeeded},
            ${input.errorCategory}::text
          )
        `);

        if (!effect) {
          throw new Error(
            "Identity Auth effect completion returned no result.",
          );
        }

        return effect;
      },
    );
  }

  return {
    applyTransition(command: AdminModerationCommand) {
      return runVerifiedTransaction(
        { requestId: command.requestId },
        async (transaction, actor) => {
          await applyAuditContext(transaction, {
            accountId: actor.accountId,
            reason:
              command.reason ??
              `Administrative moderation action: ${command.action}`,
            requestId: command.requestId,
          });

          const [transition] =
            await transaction.execute<AdminModerationFunctionRow>(sql`
              select
                result_kind,
                event_id,
                account_id,
                auth_user_id,
                status,
                account_version,
                profile_version,
                auth_effect_id,
                ${command.action}::public.moderation_action as action
              from public.app_apply_admin_moderation(
                ${command.accountId}::uuid,
                ${command.action}::public.moderation_action,
                ${command.reason}::text,
                ${command.expectedAccountVersion},
                ${command.expectedProfileVersion},
                ${command.idempotencyKey}
              )
            `);

          if (!transition) {
            throw new Error("Admin moderation transition returned no result.");
          }

          return {
            accountId: transition.account_id,
            accountVersion: transition.account_version,
            action: transition.action,
            authEffectId: transition.auth_effect_id,
            authUserId: transition.auth_user_id,
            eventId: transition.event_id,
            kind:
              transition.result_kind === "APPLIED"
                ? ("applied" as const)
                : ("already_applied" as const),
            profileVersion: transition.profile_version,
            status: transition.status,
          } satisfies AdminModerationTransition;
        },
      );
    },

    markAuthEffectFailed(input: {
      effectId: string;
      errorCategory: "SUPABASE_AUTH";
      requestId: string;
    }) {
      return completeAuthEffect({
        ...input,
        succeeded: false,
      }).then(() => undefined);
    },

    markAuthEffectSynced(input: { effectId: string; requestId: string }) {
      return completeAuthEffect({
        ...input,
        errorCategory: null,
        succeeded: true,
      }).then(() => undefined);
    },

    resolveRetryableAuthEffect(input: { effectId: string; requestId: string }) {
      return runVerifiedTransaction(
        { requestId: input.requestId },
        async (transaction, actor) => {
          await applyAuditContext(transaction, {
            accountId: actor.accountId,
            reason: "Inspect retryable Supabase Auth moderation effect",
            requestId: input.requestId,
          });

          const [effect] = await transaction
            .select({
              action: identityAuthEffects.action,
              authUserId: identityAuthEffects.authUserId,
              effectId: identityAuthEffects.id,
            })
            .from(identityAuthEffects)
            .where(
              and(
                eq(identityAuthEffects.id, input.effectId),
                inArray(identityAuthEffects.action, ["BAN", "UNBAN"]),
                inArray(identityAuthEffects.status, ["PENDING", "FAILED"]),
              ),
            )
            .limit(1);

          if (
            !effect ||
            (effect.action !== "BAN" && effect.action !== "UNBAN")
          ) {
            return null;
          }

          return {
            action: effect.action,
            authUserId: effect.authUserId,
            effectId: effect.effectId,
          };
        },
      );
    },
  };
}

export async function createServerAdminModerationRepository() {
  return createDrizzleAdminModerationRepository({
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
