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

async function findAccountsForIdentity(
  database: ApplicationDatabase | ApplicationTransaction,
  identityId: string,
) {
  return database
    .select()
    .from(accounts)
    .where(eq(accounts.authUserId, identityId));
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
      const identityAccounts = await findAccountsForIdentity(
        database,
        identityId,
      );
      // An identity can now own an ADMIN row and a linked INFLUENCER/COMPANY
      // row. Onboarding entry only cares about the linked, non-admin role: an
      // admin with no linked profile yet should still see "ready" (pick a
      // role) rather than being routed off by their admin row.
      const relevantAccount = identityAccounts.find(
        (account) => account.role && account.role !== "ADMIN",
      );

      return relevantAccount ? toAccountSummary(relevantAccount) : null;
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
          const identityAccounts = await findAccountsForIdentity(
            transaction,
            identityId,
          );
          const sameRoleAccount = identityAccounts.find(
            (account) => account.role === role,
          );

          if (sameRoleAccount) {
            return {
              account: toAccountSummary(sameRoleAccount),
              kind: "already_selected" as const,
            };
          }

          const conflictingAccount = identityAccounts.find(
            (account) => account.role && account.role !== "ADMIN",
          );

          if (conflictingAccount) {
            return {
              account: toAccountSummary(conflictingAccount),
              kind: "conflict" as const,
            };
          }

          const blankAccount = identityAccounts.find(
            (account) => !account.role,
          );

          if (blankAccount) {
            const [updatedAccount] = await transaction
              .update(accounts)
              .set({
                role,
                updatedAt: new Date(),
                version: sql`${accounts.version} + 1`,
              })
              .where(
                and(eq(accounts.id, blankAccount.id), isNull(accounts.role)),
              )
              .returning();

            if (updatedAccount) {
              return {
                account: toAccountSummary(updatedAccount),
                kind: "selected" as const,
              };
            }
          } else {
            // No blank row and no existing row of this role — either a brand
            // new identity, or (dual-role) an ADMIN identity linking a
            // creator/company profile for the first time. Either way, insert
            // a new row alongside whatever else this identity already owns.
            const [insertedAccount] = await transaction
              .insert(accounts)
              .values({
                authUserId: identityId,
                operationalEmail: email.trim().toLowerCase(),
                role,
              })
              .onConflictDoNothing({
                target: [accounts.authUserId, accounts.role],
              })
              .returning();

            if (insertedAccount) {
              return {
                account: toAccountSummary(insertedAccount),
                kind: "selected" as const,
              };
            }
          }

          const concurrentAccounts = await findAccountsForIdentity(
            transaction,
            identityId,
          );
          const concurrentAccount = concurrentAccounts.find(
            (account) => account.role === role,
          );

          if (!concurrentAccount) {
            throw new Error("Role selection transaction did not converge.");
          }

          return {
            account: toAccountSummary(concurrentAccount),
            kind: "already_selected" as const,
          };
        },
      );
    },
  };
}
