import "server-only";

import { and, asc, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";

import type { ApplicationDatabase, ApplicationTransaction } from "@/db/client";
import { accounts, mediaAssets } from "@/db/schema";

import type {
  RecoveredAccount,
  RequestedAccountDeletion,
} from "../../types/account-deletion.types";

export interface DueAccount {
  authUserId: string;
  deletionDueAt: Date;
  id: string;
  /** True when only the Auth identity is left to remove (database already done). */
  onlyIdentityPending: boolean;
}

export const AUTH_DELETE_FAILURE_CODE = "AUTH_DELETE";

function firstRow<T>(rows: unknown): T | undefined {
  return (rows as T[])[0];
}

export function createDrizzleAccountDeletionRepository(
  database: ApplicationDatabase,
) {
  return {
    async requestOwnDeletion(
      transaction: ApplicationTransaction,
    ): Promise<RequestedAccountDeletion> {
      const rows = await transaction.execute(
        sql`select * from public.app_request_account_deletion()`,
      );
      const row = firstRow<{
        account_id: string;
        auth_user_id: string;
        elimination_eligible_at: Date | string;
        outbox_id: string;
      }>(rows);

      if (!row) {
        throw new Error("account_deletion_not_available");
      }

      return {
        accountId: row.account_id,
        authUserId: row.auth_user_id,
        eliminationEligibleAt: new Date(row.elimination_eligible_at),
        outboxId: row.outbox_id,
      };
    },

    async recoverAccount(
      transaction: ApplicationTransaction,
      input: { accountId: string; reason: string },
    ): Promise<RecoveredAccount> {
      const rows = await transaction.execute(
        sql`select * from public.app_admin_recover_account(${input.accountId}::uuid, ${input.reason})`,
      );
      const row = firstRow<{
        account_id: string;
        auth_user_id: string;
        outbox_id: string;
      }>(rows);

      if (!row) {
        throw new Error("account_recovery_not_pending");
      }

      return {
        accountId: row.account_id,
        authUserId: row.auth_user_id,
        outboxId: row.outbox_id,
      };
    },

    /** Accounts past their recovery window, plus identities left to remove. */
    async listDueAccounts(limit: number, now: Date): Promise<DueAccount[]> {
      const rows = await database
        .select({
          authUserId: accounts.authUserId,
          deletionDueAt: accounts.deletionDueAt,
          deletionFailureCode: accounts.deletionFailureCode,
          deletionState: accounts.deletionState,
          id: accounts.id,
        })
        .from(accounts)
        .where(
          or(
            and(
              inArray(accounts.deletionState, ["REQUESTED", "FAILED"]),
              lte(accounts.eliminationEligibleAt, now),
            ),
            and(
              eq(accounts.deletionState, "ELIMINATED"),
              eq(accounts.deletionFailureCode, AUTH_DELETE_FAILURE_CODE),
            ),
          ),
        )
        .orderBy(asc(accounts.deletionDueAt), asc(accounts.id))
        .limit(limit);

      return rows.map((row) => ({
        authUserId: row.authUserId,
        deletionDueAt: row.deletionDueAt as Date,
        id: row.id,
        onlyIdentityPending: row.deletionState === "ELIMINATED",
      }));
    },

    /** Pending accounts whose legal deadline is within `before`. */
    async countPendingDueBefore(before: Date): Promise<number> {
      const rows = await database
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            inArray(accounts.deletionState, ["REQUESTED", "FAILED"]),
            isNotNull(accounts.deletionDueAt),
            lte(accounts.deletionDueAt, before),
          ),
        );

      return rows.length;
    },

    async listMediaObjects(accountId: string) {
      return database
        .select({
          bucket: mediaAssets.bucketName,
          path: mediaAssets.objectPath,
        })
        .from(mediaAssets)
        .where(eq(mediaAssets.ownerAccountId, accountId));
    },

    async eliminateAccountData(
      transaction: ApplicationTransaction,
      accountId: string,
    ) {
      await transaction.execute(
        sql`select public.app_eliminate_account_data(${accountId}::uuid)`,
      );
    },

    async markFailed(accountId: string, failureCode: string) {
      await database
        .update(accounts)
        .set({ deletionFailureCode: failureCode, deletionState: "FAILED" })
        .where(
          and(
            eq(accounts.id, accountId),
            inArray(accounts.deletionState, ["REQUESTED", "FAILED"]),
          ),
        );
    },

    async markIdentityDeleted(accountId: string) {
      await database
        .update(accounts)
        .set({ deletionFailureCode: null })
        .where(
          and(
            eq(accounts.id, accountId),
            eq(accounts.deletionState, "ELIMINATED"),
          ),
        );
    },

    async markIdentityPending(accountId: string) {
      await database
        .update(accounts)
        .set({ deletionFailureCode: AUTH_DELETE_FAILURE_CODE })
        .where(
          and(
            eq(accounts.id, accountId),
            eq(accounts.deletionState, "ELIMINATED"),
          ),
        );
    },
  };
}

export type AccountDeletionRepository = ReturnType<
  typeof createDrizzleAccountDeletionRepository
>;
