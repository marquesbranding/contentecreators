import "server-only";

import type { StorageObjectRef } from "../../types/account-deletion.types";
import type { AccountDeletionIdentityGateway } from "../gateways/supabase-account-deletion-identity.gateway";
import type { AccountDeletionRepository } from "../repositories/drizzle-account-deletion.repository";

export interface StorageCleanupResult {
  failed: number;
  removed: number;
}

interface Dependencies {
  identity: Pick<AccountDeletionIdentityGateway, "removeStorageObjects">;
  repository: Pick<
    AccountDeletionRepository,
    | "completeStorageCleanup"
    | "listStorageCleanup"
    | "recordStorageCleanupFailure"
  >;
}

export const STORAGE_FAILURE_CODE = "STORAGE";

function groupByBucket(objects: StorageObjectRef[]) {
  const byBucket = new Map<string, StorageObjectRef[]>();

  for (const object of objects) {
    byBucket.set(object.bucket, [
      ...(byBucket.get(object.bucket) ?? []),
      object,
    ]);
  }

  return byBucket;
}

/**
 * Removes Storage objects of deleted accounts. The database function already
 * queued every path in the same transaction as the deletion, so a removal that
 * fails (or never runs) stays queued for the daily routine.
 */
export function createStorageCleanup({ identity, repository }: Dependencies) {
  async function remove(
    objects: StorageObjectRef[],
  ): Promise<StorageCleanupResult> {
    const result: StorageCleanupResult = { failed: 0, removed: 0 };

    for (const [bucket, group] of groupByBucket(objects)) {
      let removed = false;

      try {
        removed = await identity.removeStorageObjects(
          bucket,
          group.map((object) => object.path),
        );
      } catch {
        removed = false;
      }

      if (removed) {
        await repository.completeStorageCleanup(group);
        result.removed += group.length;
      } else {
        await repository.recordStorageCleanupFailure(
          group,
          STORAGE_FAILURE_CODE,
        );
        result.failed += group.length;
      }
    }

    return result;
  }

  return {
    remove,

    async drainQueue(limit: number): Promise<StorageCleanupResult> {
      return remove(await repository.listStorageCleanup(limit));
    },
  };
}

export type StorageCleanup = ReturnType<typeof createStorageCleanup>;
