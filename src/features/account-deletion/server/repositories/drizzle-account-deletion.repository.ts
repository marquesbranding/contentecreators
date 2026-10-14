import "server-only";

import { and, asc, count, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";

import type { ApplicationDatabase, ApplicationTransaction } from "@/db/client";
import { accounts, storageCleanupQueue } from "@/db/schema";

import type {
  DeletedAccount,
  StorageObjectRef,
} from "../../types/account-deletion.types";

/** An account left behind by the previous 30-day flow. */
export interface LegacyDeletionAccount {
  authUserId: string | null;
  deletionState: "ELIMINATED" | "FAILED" | "REQUESTED";
  id: string;
}

export interface QueuedStorageObject extends StorageObjectRef {
  attemptCount: number;
}

function firstRow<T>(rows: unknown): T | undefined {
  return (rows as T[])[0];
}

export function parseStorageObjects(value: unknown): StorageObjectRef[] {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item: unknown) => {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { bucket?: unknown }).bucket === "string" &&
      typeof (item as { path?: unknown }).path === "string"
    ) {
      const { bucket, path } = item as StorageObjectRef;

      return [{ bucket, path }];
    }

    return [];
  });
}

function objectPredicate(objects: StorageObjectRef[]) {
  return sql`(${storageCleanupQueue.bucketName}, ${storageCleanupQueue.objectPath}) in (${sql.join(
    objects.map((object) => sql`(${object.bucket}, ${object.path})`),
    sql`, `,
  )})`;
}

/**
 * Self-service deletion runs inside the caller's verified transaction (role
 * `contente_app_user`). Everything else here is for server routines only and
 * uses the owner connection: the cleanup queue has no grant for the app role.
 */
export function createDrizzleAccountDeletionRepository(
  database: ApplicationDatabase,
) {
  return {
    async deleteOwnAccount(
      transaction: ApplicationTransaction,
    ): Promise<DeletedAccount> {
      const rows = await transaction.execute(
        sql`select * from public.app_delete_own_account()`,
      );
      const row = firstRow<{
        account_id: string;
        outbox_id: string;
        storage_objects: unknown;
      }>(rows);

      if (!row) {
        throw new Error("account_deletion_not_available");
      }

      return {
        accountId: row.account_id,
        outboxId: row.outbox_id,
        storageObjects: parseStorageObjects(row.storage_objects),
      };
    },

    /** Legacy accounts the routine retries on its own (FAILED only). */
    async listFailedAccounts(limit: number): Promise<LegacyDeletionAccount[]> {
      const rows = await database
        .select({
          authUserId: accounts.authUserId,
          deletionState: accounts.deletionState,
          id: accounts.id,
        })
        .from(accounts)
        .where(eq(accounts.deletionState, "FAILED"))
        .orderBy(asc(accounts.deletionDueAt), asc(accounts.id))
        .limit(limit);

      return rows.map((row) => ({
        authUserId: row.authUserId,
        deletionState: "FAILED" as const,
        id: row.id,
      }));
    },

    /**
     * Every account the operator script may migrate: legacy REQUESTED/FAILED
     * accounts and old tombstones that still hold the login link.
     */
    async listLegacyAccounts(): Promise<LegacyDeletionAccount[]> {
      const rows = await database
        .select({
          authUserId: accounts.authUserId,
          deletionState: accounts.deletionState,
          id: accounts.id,
        })
        .from(accounts)
        .where(
          sql`${accounts.deletionState} in ('REQUESTED', 'FAILED') or (${accounts.deletionState} = 'ELIMINATED' and ${accounts.authUserId} is not null)`,
        )
        .orderBy(asc(accounts.deletionDueAt), asc(accounts.id));

      return rows.flatMap((row) =>
        row.deletionState
          ? [
              {
                authUserId: row.authUserId,
                deletionState: row.deletionState,
                id: row.id,
              },
            ]
          : [],
      );
    },

    /** Legacy accounts whose legal deadline is within `before`. */
    async countPendingDueBefore(before: Date): Promise<number> {
      const [row] = await database
        .select({ total: count() })
        .from(accounts)
        .where(
          and(
            inArray(accounts.deletionState, ["REQUESTED", "FAILED"]),
            isNotNull(accounts.deletionDueAt),
            lte(accounts.deletionDueAt, before),
          ),
        );

      return row?.total ?? 0;
    },

    /** True when the login still owns a banned account (its ban must stay). */
    async hasBannedAccount(authUserId: string): Promise<boolean> {
      const [row] = await database
        .select({ total: count() })
        .from(accounts)
        .where(
          and(
            eq(accounts.authUserId, authUserId),
            eq(accounts.status, "BANNED"),
          ),
        );

      return (row?.total ?? 0) > 0;
    },

    async eliminateAccountData(
      transaction: ApplicationTransaction,
      accountId: string,
    ): Promise<StorageObjectRef[]> {
      const rows = await transaction.execute(
        sql`select public.app_eliminate_account_data(${accountId}::uuid) as storage_objects`,
      );

      return parseStorageObjects(
        firstRow<{ storage_objects: unknown }>(rows)?.storage_objects,
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

    async listStorageCleanup(limit: number): Promise<QueuedStorageObject[]> {
      const rows = await database
        .select({
          attemptCount: storageCleanupQueue.attemptCount,
          bucket: storageCleanupQueue.bucketName,
          path: storageCleanupQueue.objectPath,
        })
        .from(storageCleanupQueue)
        .orderBy(
          asc(storageCleanupQueue.createdAt),
          asc(storageCleanupQueue.id),
        )
        .limit(limit);

      return rows;
    },

    async countStorageCleanup(): Promise<number> {
      const [row] = await database
        .select({ total: count() })
        .from(storageCleanupQueue);

      return row?.total ?? 0;
    },

    async completeStorageCleanup(objects: StorageObjectRef[]) {
      if (objects.length === 0) {
        return;
      }

      await database
        .delete(storageCleanupQueue)
        .where(objectPredicate(objects));
    },

    async recordStorageCleanupFailure(
      objects: StorageObjectRef[],
      errorCode: string,
    ) {
      if (objects.length === 0) {
        return;
      }

      await database
        .update(storageCleanupQueue)
        .set({
          attemptCount: sql`${storageCleanupQueue.attemptCount} + 1`,
          lastAttemptAt: new Date(),
          lastErrorCode: errorCode,
        })
        .where(objectPredicate(objects));
    },
  };
}

export type AccountDeletionRepository = ReturnType<
  typeof createDrizzleAccountDeletionRepository
>;
