import "server-only";

import { createHash } from "node:crypto";

import type { ApplicationTransaction } from "@/db/client";
import type { VerifiedAuditContext } from "@/features/audit/server";

import { DEADLINE_ALERT_DAYS } from "../../domain/deletion-policy";
import type { StorageObjectRef } from "../../types/account-deletion.types";
import type { AccountDeletionIdentityGateway } from "../gateways/supabase-account-deletion-identity.gateway";
import type {
  AccountDeletionRepository,
  LegacyDeletionAccount,
} from "../repositories/drizzle-account-deletion.repository";
import type { StorageCleanup } from "./storage-cleanup.service";

export interface EliminationSummary {
  candidates: number;
  deadlineAlerts: number;
  dryRun: boolean;
  eliminated: number;
  failed: number;
  fingerprint: string;
  storageFailed: number;
  storageQueued: number;
  storageRemoved: number;
}

export type LegacyEliminationOutcome =
  "eliminated" | "failed_database" | "failed_identity";

export const AUTH_UNBAN_FAILURE_CODE = "AUTH_UNBAN";
export const DATABASE_FAILURE_CODE = "DATABASE";

const STORAGE_BATCH_SIZE = 100;

interface Dependencies {
  identity: Pick<AccountDeletionIdentityGateway, "liftDeletionBan">;
  log?: (event: {
    event: string;
    level: "info" | "warn" | "error";
    count?: number;
    failureCode?: string;
    requestId: string;
  }) => void;
  now?: () => Date;
  repository: Pick<
    AccountDeletionRepository,
    | "countPendingDueBefore"
    | "countStorageCleanup"
    | "eliminateAccountData"
    | "hasBannedAccount"
    | "listFailedAccounts"
    | "markFailed"
  >;
  runSystemTransaction<T>(
    context: VerifiedAuditContext,
    work: (transaction: ApplicationTransaction) => Promise<T>,
  ): Promise<T>;
  storage: StorageCleanup;
}

/** Fingerprint over the exact candidate set, without any personal data. */
export function fingerprintCandidates(ids: string[], dryRun: boolean) {
  return createHash("sha256")
    .update(JSON.stringify({ dryRun, ids: [...ids].sort() }))
    .digest("hex");
}

/** Supabase project ref of production (`contente-creators-prd`). */
export const PRODUCTION_SUPABASE_PROJECT_REF = "kstbhqeiebutpfvswyla";

export interface ExecuteGateInput {
  /** `APP_ENV` as parsed from the environment. */
  appEnvironment: string;
  /** Fingerprint of the candidate set computed from the database right now. */
  candidateFingerprint: string;
  confirmedWithClient: boolean;
  execute: boolean;
  /** `--fingerprint=<value>` as given by the operator, if any. */
  fingerprint: string | undefined;
  /** `NEXT_PUBLIC_SUPABASE_URL` as read by the script. */
  supabaseUrl: string;
}

/**
 * Operator gate for the legacy elimination script. A dry run is always allowed.
 * An execution needs `--confirmed-with-client` (always, not only in production)
 * and the fingerprint printed by a dry run, so it erases exactly the set the
 * client approved. Production is detected from `APP_ENV` *or* the Supabase URL,
 * because a shell variable can point at production while `APP_ENV` stays local.
 */
export function assertExecuteAllowed(input: ExecuteGateInput): void {
  if (!input.execute) {
    return;
  }

  const targetsProduction =
    input.appEnvironment === "production" ||
    input.supabaseUrl.includes(PRODUCTION_SUPABASE_PROJECT_REF);

  if (!input.confirmedWithClient) {
    throw new Error(
      targetsProduction
        ? "Produção detectada (APP_ENV ou URL do Supabase): exige --confirmed-with-client."
        : "--execute exige --confirmed-with-client.",
    );
  }

  if (!input.fingerprint) {
    throw new Error(
      "--execute exige --fingerprint=<valor impresso pelo dry run>.",
    );
  }

  if (input.fingerprint !== input.candidateFingerprint) {
    throw new Error(
      "O conjunto de contas mudou desde o dry run (fingerprint diferente). Rode o dry run de novo e confirme com o cliente.",
    );
  }
}

/**
 * Daily catch-up routine. Self-service deletion is immediate, so this only
 * (1) retries Storage objects left in the cleanup queue, (2) finishes legacy
 * accounts the previous 30-day flow left in FAILED and (3) alerts when a
 * legacy REQUESTED/FAILED account nears the 120-day legal deadline. Legacy
 * REQUESTED accounts are never eliminated here: that needs the operator script
 * after client confirmation (docs/operations/account-deletion.md).
 */
export function createAccountEliminationService({
  identity,
  log = () => undefined,
  now = () => new Date(),
  repository,
  runSystemTransaction,
  storage,
}: Dependencies) {
  /**
   * Same path for the routine and the operator script. The erase runs first:
   * if it fails, the login keeps its legacy ban and the account stays FAILED
   * (retryable). The erase unlinks `auth_user_id`, so the login id is read from
   * the account row before it, and the ban is lifted only after the data is gone.
   */
  async function eliminateLegacyAccount(
    account: LegacyDeletionAccount,
    requestId: string,
  ): Promise<{
    outcome: LegacyEliminationOutcome;
    storage?: { failed: number; removed: number };
  }> {
    const authUserId = account.authUserId;
    // A login that still owns a BANNED account keeps its ban. Read before the
    // erase, while the link still exists.
    const keepBan =
      authUserId !== null && (await repository.hasBannedAccount(authUserId));

    let objects: StorageObjectRef[];

    try {
      objects = await runSystemTransaction(
        {
          actorAccountId: null,
          actorRole: null,
          actorType: "SYSTEM",
          reason: "Eliminação de conta do fluxo anterior de exclusão",
          requestId,
          source: "CRON",
        },
        (transaction) =>
          repository.eliminateAccountData(transaction, account.id),
      );
    } catch {
      await repository.markFailed(account.id, DATABASE_FAILURE_CODE);

      return { outcome: "failed_database" };
    }

    // The data is gone and its Storage paths are queued: only now lift the ban.
    const unbanned =
      authUserId === null ||
      keepBan ||
      (await identity.liftDeletionBan(authUserId).catch(() => false));
    const removed = await storage.remove(objects);

    if (!unbanned) {
      // The account is already a tombstone without its login link, so a later
      // run cannot find the login again. Reported as a failure for the operator.
      return { outcome: "failed_identity", storage: removed };
    }

    return { outcome: "eliminated", storage: removed };
  }

  return {
    eliminateLegacyAccount,

    async run({
      batchSize,
      dryRun,
      requestId,
    }: {
      batchSize: number;
      dryRun: boolean;
      requestId: string;
    }): Promise<EliminationSummary> {
      const current = now();
      const failedAccounts = await repository.listFailedAccounts(batchSize);
      const deadlineAlerts = await repository.countPendingDueBefore(
        new Date(current.getTime() + DEADLINE_ALERT_DAYS * 24 * 60 * 60 * 1000),
      );
      const summary: EliminationSummary = {
        candidates: failedAccounts.length,
        deadlineAlerts,
        dryRun,
        eliminated: 0,
        failed: 0,
        fingerprint: fingerprintCandidates(
          failedAccounts.map((account) => account.id),
          dryRun,
        ),
        storageFailed: 0,
        storageQueued: await repository.countStorageCleanup(),
        storageRemoved: 0,
      };

      if (deadlineAlerts > 0) {
        log({
          count: deadlineAlerts,
          event: "account_elimination_deadline_near",
          level: "error",
          requestId,
        });
      }

      if (dryRun) {
        return summary;
      }

      for (const account of failedAccounts) {
        const result = await eliminateLegacyAccount(account, requestId);

        if (result.outcome === "eliminated") {
          summary.eliminated += 1;
          continue;
        }

        summary.failed += 1;
        log({
          event: "account_elimination_failed",
          failureCode:
            result.outcome === "failed_identity"
              ? AUTH_UNBAN_FAILURE_CODE
              : DATABASE_FAILURE_CODE,
          level: "error",
          requestId,
        });
      }

      const drained = await storage.drainQueue(STORAGE_BATCH_SIZE);
      summary.storageRemoved = drained.removed;
      summary.storageFailed = drained.failed;

      if (drained.failed > 0) {
        log({
          count: drained.failed,
          event: "account_storage_cleanup_failed",
          failureCode: "STORAGE",
          level: "error",
          requestId,
        });
      }

      log({
        count: summary.eliminated + summary.storageRemoved,
        event: "account_elimination_completed",
        level: "info",
        requestId,
      });

      return summary;
    },
  };
}

export type AccountEliminationService = ReturnType<
  typeof createAccountEliminationService
>;
