import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import {
  getDatabaseClient,
  type ApplicationDatabase,
  type ApplicationTransaction,
} from "@/db/client";
import { accounts } from "@/db/schema";
import {
  applyVerifiedAuditContext,
  createAuditedTransactionRunner,
} from "@/features/audit/server/services/audited-transaction";
import type { VerifiedAuditContext } from "@/features/audit/schemas/audit-context-schema";

import type { VerifiedAccountTransactionRunner } from "../services/verified-account-transaction";
import type {
  AdminIdentity,
  AdminProvisioningOutcome,
} from "../services/admin-provisioning.service";

type BootstrapTransactionRunner = <T>(
  context: VerifiedAuditContext,
  work: (transaction: ApplicationTransaction) => Promise<T>,
) => Promise<T>;

interface AdminProvisioningDatabase {
  execute: ApplicationDatabase["execute"];
  select: ApplicationDatabase["select"];
}

interface DrizzleAdminProvisioningDependencies {
  database?: AdminProvisioningDatabase;
  runBootstrapTransaction?: BootstrapTransactionRunner;
  runVerifiedAccountTransaction?: VerifiedAccountTransactionRunner;
}

interface AuthIdentityRow extends Record<string, unknown> {
  email: string;
  id: string;
}

interface ProvisioningFunctionRow extends Record<string, unknown> {
  account_id: string;
  outcome: "already_provisioned" | "provisioned";
}

function databaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  return "cause" in error ? databaseErrorCode(error.cause) : null;
}

function toOutcome(row: ProvisioningFunctionRow): AdminProvisioningOutcome {
  return {
    accountId: row.account_id,
    kind: row.outcome,
  };
}

export function createDrizzleAdminProvisioningRepository(
  dependencies: DrizzleAdminProvisioningDependencies = {},
) {
  const database = dependencies.database ?? getDatabaseClient().database;

  return {
    async bootstrapInitialAdmin(input: {
      approvalReference: string;
      email: string;
      identityId: string;
      requestId: string;
    }): Promise<AdminProvisioningOutcome> {
      const runBootstrapTransaction =
        dependencies.runBootstrapTransaction ??
        createAuditedTransactionRunner(getDatabaseClient().database);

      return runBootstrapTransaction(
        {
          actorAccountId: null,
          actorRole: null,
          actorType: "SYSTEM",
          reason: `Initial administrator bootstrap: ${input.approvalReference}`,
          requestId: input.requestId,
          source: "SCRIPT",
        },
        async (transaction) => {
          await transaction.execute(
            sql`select pg_advisory_xact_lock(hashtext('contente-creators-initial-admin'))`,
          );
          const [targetAccount] = await transaction
            .select()
            .from(accounts)
            .where(eq(accounts.authUserId, input.identityId))
            .limit(1);
          const activeAdmins = await transaction
            .select({ id: accounts.id })
            .from(accounts)
            .where(
              and(
                eq(accounts.role, "ADMIN"),
                eq(accounts.status, "APPROVED"),
                isNull(accounts.archivedAt),
              ),
            )
            .limit(2);

          if (
            targetAccount?.role === "ADMIN" &&
            targetAccount.status === "APPROVED" &&
            !targetAccount.archivedAt
          ) {
            return {
              accountId: targetAccount.id,
              kind: "already_provisioned" as const,
            };
          }

          if (activeAdmins.length > 0) {
            return {
              code: "INITIAL_ADMIN_ALREADY_EXISTS" as const,
              kind: "rejected" as const,
            };
          }

          if (
            targetAccount &&
            (targetAccount.role !== null ||
              targetAccount.archivedAt !== null ||
              targetAccount.status === "SUSPENDED" ||
              targetAccount.status === "BANNED")
          ) {
            return {
              code: "ADMIN_CONFLICT" as const,
              kind: "rejected" as const,
            };
          }

          if (targetAccount) {
            const [updated] = await transaction
              .update(accounts)
              .set({
                approvedAt: new Date(),
                bannedAt: null,
                completionPercentage: 100,
                operationalEmail: input.email,
                role: "ADMIN",
                status: "APPROVED",
                submittedAt: targetAccount.submittedAt ?? new Date(),
                suspendedAt: null,
              })
              .where(
                and(eq(accounts.id, targetAccount.id), isNull(accounts.role)),
              )
              .returning({ id: accounts.id });

            if (updated) {
              return {
                accountId: updated.id,
                kind: "provisioned" as const,
              };
            }
          } else {
            const [inserted] = await transaction
              .insert(accounts)
              .values({
                approvedAt: new Date(),
                authUserId: input.identityId,
                completionPercentage: 100,
                operationalEmail: input.email,
                role: "ADMIN",
                status: "APPROVED",
                submittedAt: new Date(),
              })
              .onConflictDoNothing({
                target: accounts.authUserId,
              })
              .returning({ id: accounts.id });

            if (inserted) {
              return {
                accountId: inserted.id,
                kind: "provisioned" as const,
              };
            }
          }

          const [concurrentAccount] = await transaction
            .select()
            .from(accounts)
            .where(eq(accounts.authUserId, input.identityId))
            .limit(1);

          return concurrentAccount?.role === "ADMIN" &&
            concurrentAccount.status === "APPROVED" &&
            !concurrentAccount.archivedAt
            ? {
                accountId: concurrentAccount.id,
                kind: "already_provisioned" as const,
              }
            : {
                code: "ADMIN_CONFLICT" as const,
                kind: "rejected" as const,
              };
        },
      );
    },

    async findIdentityByEmail(email: string): Promise<AdminIdentity | null> {
      const [identity] = await database.execute<AuthIdentityRow>(sql`
        select
          auth_user.id,
          lower(auth_user.email) as email
        from auth.users auth_user
        where lower(auth_user.email) = lower(trim(${email}))
        limit 1
      `);

      return identity
        ? {
            email: identity.email,
            id: identity.id,
          }
        : null;
    },

    async inspectInitialAdmin(identityId: string | null) {
      const activeAdmins = await database
        .select({
          authUserId: accounts.authUserId,
          id: accounts.id,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.role, "ADMIN"),
            eq(accounts.status, "APPROVED"),
            isNull(accounts.archivedAt),
          ),
        )
        .limit(2);

      if (
        identityId &&
        activeAdmins.some((admin) => admin.authUserId === identityId)
      ) {
        return { kind: "already_provisioned" as const };
      }

      if (activeAdmins.length > 0) {
        return { kind: "conflict" as const };
      }

      if (!identityId) {
        return { kind: "available" as const };
      }

      const [targetAccount] = await database
        .select({
          archivedAt: accounts.archivedAt,
          role: accounts.role,
          status: accounts.status,
        })
        .from(accounts)
        .where(eq(accounts.authUserId, identityId))
        .limit(1);
      const incompatibleTarget =
        targetAccount &&
        (targetAccount.role !== null ||
          targetAccount.archivedAt !== null ||
          targetAccount.status === "SUSPENDED" ||
          targetAccount.status === "BANNED");

      return incompatibleTarget
        ? { kind: "conflict" as const }
        : { kind: "available" as const };
    },

    async provisionAdditionalAdmin(input: {
      email: string;
      identityId: string;
      reason: string;
      requestId: string;
    }): Promise<AdminProvisioningOutcome> {
      if (!dependencies.runVerifiedAccountTransaction) {
        throw new Error(
          "Verified account transaction runner is required for admin provisioning.",
        );
      }

      return dependencies.runVerifiedAccountTransaction(
        { requestId: input.requestId },
        async (transaction, actor) => {
          await applyVerifiedAuditContext(transaction, {
            actorAccountId: actor.accountId,
            actorRole: actor.role,
            actorType: actor.role === "ADMIN" ? "ADMIN" : "USER",
            reason: input.reason,
            requestId: input.requestId,
            source: "BACKOFFICE",
          });

          try {
            const [result] =
              await transaction.execute<ProvisioningFunctionRow>(sql`
                select account_id, outcome
                from public.provision_additional_admin(
                  ${input.identityId}::uuid,
                  ${input.email}
                )
              `);

            if (!result) {
              throw new Error(
                "Administrator provisioning function returned no result.",
              );
            }

            return toOutcome(result);
          } catch (error) {
            const code = databaseErrorCode(error);

            if (code === "42501") {
              return {
                code: "ADMIN_REQUIRED" as const,
                kind: "rejected" as const,
              };
            }

            if (code === "23514") {
              return {
                code: "ADMIN_CONFLICT" as const,
                kind: "rejected" as const,
              };
            }

            throw error;
          }
        },
      );
    },
  };
}

export async function createServerAdminProvisioningRepository() {
  const { createServerVerifiedAccountTransactionRunner } =
    await import("../services/verified-account-transaction");

  return createDrizzleAdminProvisioningRepository({
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
