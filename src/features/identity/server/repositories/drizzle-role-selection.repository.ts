import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import {
  getDatabaseClient,
  type ApplicationDatabase,
  type ApplicationTransaction,
} from "@/db/client";
import { accounts } from "@/db/schema";
import {
  createAuditedTransactionRunner,
  withAuditedTransaction,
} from "@/features/audit/server";
import type { VerifiedAuditContext } from "@/features/audit/server";

import type {
  IdentityAccountSummary,
  RoleSelectionRepository,
} from "../services/role-selection.service";

function toAccountSummary(
  account: typeof accounts.$inferSelect,
): IdentityAccountSummary {
  return {
    id: account.id,
    role: account.role,
    status: account.status,
  };
}

async function findAccount(
  database: ApplicationTransaction,
  identityId: string,
) {
  const [account] = await database
    .select()
    .from(accounts)
    .where(eq(accounts.authUserId, identityId))
    .limit(1);

  return account ?? null;
}

interface DrizzleRoleSelectionDependencies {
  database?: ApplicationDatabase;
  runAuditedTransaction?: ReturnType<typeof createAuditedTransactionRunner>;
}

export function createDrizzleRoleSelectionRepository(
  dependencies: DrizzleRoleSelectionDependencies = {},
): RoleSelectionRepository {
  const database = dependencies.database ?? getDatabaseClient().database;
  const runAuditedTransaction =
    dependencies.runAuditedTransaction ??
    (<T>(
      context: VerifiedAuditContext,
      work: (transaction: ApplicationTransaction) => Promise<T>,
    ) => withAuditedTransaction(context, work));

  return {
    async findByIdentityId(identityId) {
      const [account] = await database
        .select()
        .from(accounts)
        .where(eq(accounts.authUserId, identityId))
        .limit(1);

      return account ? toAccountSummary(account) : null;
    },

    async selectInitialRole({ email, identityId, requestId, role }) {
      return runAuditedTransaction(
        {
          actorAccountId: null,
          actorRole: null,
          actorType: "SYSTEM",
          reason: "Initial application role selection",
          requestId,
          source: "AUTH_HOOK",
        },
        async (transaction) => {
          const existingAccount = await findAccount(transaction, identityId);

          if (existingAccount?.role) {
            return {
              account: toAccountSummary(existingAccount),
              kind:
                existingAccount.role === role
                  ? ("already_selected" as const)
                  : ("conflict" as const),
            };
          }

          if (existingAccount) {
            const [updatedAccount] = await transaction
              .update(accounts)
              .set({
                role,
                updatedAt: new Date(),
                version: sql`${accounts.version} + 1`,
              })
              .where(
                and(eq(accounts.id, existingAccount.id), isNull(accounts.role)),
              )
              .returning();

            if (updatedAccount) {
              return {
                account: toAccountSummary(updatedAccount),
                kind: "selected" as const,
              };
            }
          } else {
            const [insertedAccount] = await transaction
              .insert(accounts)
              .values({
                authUserId: identityId,
                operationalEmail: email.trim().toLowerCase(),
                role,
              })
              .onConflictDoNothing({
                target: accounts.authUserId,
              })
              .returning();

            if (insertedAccount) {
              return {
                account: toAccountSummary(insertedAccount),
                kind: "selected" as const,
              };
            }
          }

          const concurrentAccount = await findAccount(transaction, identityId);

          if (!concurrentAccount?.role) {
            throw new Error("Role selection transaction did not converge.");
          }

          return {
            account: toAccountSummary(concurrentAccount),
            kind:
              concurrentAccount.role === role
                ? ("already_selected" as const)
                : ("conflict" as const),
          };
        },
      );
    },
  };
}
