import "server-only";

import { createHash } from "node:crypto";

import type { ApplicationTransaction } from "@/db/client";
import type { VerifiedAuditContext } from "@/features/audit/server";

import { DEADLINE_ALERT_DAYS } from "../../domain/deletion-policy";
import type {
  AccountDeletionRepository,
  DueAccount,
} from "../repositories/drizzle-account-deletion.repository";
import type { AccountDeletionIdentityGateway } from "../gateways/supabase-account-deletion-identity.gateway";
import { collectErrorMessages } from "./account-deletion-errors";

export interface EliminationSummary {
  candidates: number;
  deadlineAlerts: number;
  dryRun: boolean;
  eliminated: number;
  failed: number;
  fingerprint: string;
  identitiesRetried: number;
}

interface Dependencies {
  identity: Pick<
    AccountDeletionIdentityGateway,
    "deleteIdentity" | "removeStorageObjects"
  >;
  log?: (event: {
    event: string;
    level: "info" | "warn" | "error";
    count?: number;
    failureCode?: string;
    requestId: string;
  }) => void;
  now?: () => Date;
  repository: AccountDeletionRepository;
  runSystemTransaction<T>(
    context: VerifiedAuditContext,
    work: (transaction: ApplicationTransaction) => Promise<T>,
  ): Promise<T>;
}

const FAILURE_BY_MARKER: [string, string][] = [
  ["account_elimination_blocked_by_sponsorship", "SPONSORSHIP"],
];

function failureCodeFor(error: unknown) {
  const message = collectErrorMessages(error);

  return (
    FAILURE_BY_MARKER.find(([marker]) => message.includes(marker))?.[1] ??
    "DATABASE"
  );
}

/** Fingerprint over the exact candidate set, without any personal data. */
export function fingerprintCandidates(ids: string[], dryRun: boolean) {
  return createHash("sha256")
    .update(JSON.stringify({ dryRun, ids: [...ids].sort() }))
    .digest("hex");
}

export function createAccountEliminationService({
  identity,
  log = () => undefined,
  now = () => new Date(),
  repository,
  runSystemTransaction,
}: Dependencies) {
  async function removeMedia(accountId: string) {
    const objects = await repository.listMediaObjects(accountId);
    const byBucket = new Map<string, string[]>();

    for (const object of objects) {
      byBucket.set(object.bucket, [
        ...(byBucket.get(object.bucket) ?? []),
        object.path,
      ]);
    }

    for (const [bucket, paths] of byBucket) {
      if (!(await identity.removeStorageObjects(bucket, paths))) {
        return false;
      }
    }

    return true;
  }

  async function finishIdentity(account: DueAccount) {
    if (await identity.deleteIdentity(account.authUserId)) {
      await repository.markIdentityDeleted(account.id);

      return true;
    }

    await repository.markIdentityPending(account.id);

    return false;
  }

  return {
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
      const due = await repository.listDueAccounts(batchSize, current);
      const deadlineAlerts = await repository.countPendingDueBefore(
        new Date(current.getTime() + DEADLINE_ALERT_DAYS * 24 * 60 * 60 * 1000),
      );
      const summary: EliminationSummary = {
        candidates: due.length,
        deadlineAlerts,
        dryRun,
        eliminated: 0,
        failed: 0,
        fingerprint: fingerprintCandidates(
          due.map((account) => account.id),
          dryRun,
        ),
        identitiesRetried: 0,
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

      for (const account of due) {
        if (account.onlyIdentityPending) {
          if (await finishIdentity(account)) {
            summary.identitiesRetried += 1;
          }
          continue;
        }

        if (!(await removeMedia(account.id))) {
          await repository.markFailed(account.id, "STORAGE");
          summary.failed += 1;
          log({
            event: "account_elimination_failed",
            failureCode: "STORAGE",
            level: "error",
            requestId,
          });
          continue;
        }

        try {
          await runSystemTransaction(
            {
              actorAccountId: null,
              actorRole: null,
              actorType: "SYSTEM",
              reason: "Eliminação de dados após exclusão de conta",
              requestId,
              source: "CRON",
            },
            (transaction) =>
              repository.eliminateAccountData(transaction, account.id),
          );
        } catch (error) {
          const failureCode = failureCodeFor(error);

          await repository.markFailed(account.id, failureCode);
          summary.failed += 1;
          log({
            event: "account_elimination_failed",
            failureCode,
            level: "error",
            requestId,
          });
          continue;
        }

        await finishIdentity(account);
        summary.eliminated += 1;
      }

      log({
        count: summary.eliminated,
        event: "account_elimination_completed",
        level: "info",
        requestId,
      });

      return summary;
    },
  };
}
