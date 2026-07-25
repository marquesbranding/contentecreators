import "server-only";

import { and, eq, sql } from "drizzle-orm";

import {
  type ApplicationDatabase,
  type ApplicationTransaction,
  getDatabaseClient,
} from "@/db/client";
import { emailAttempts, emailOutbox } from "@/db/schema";
import { applyVerifiedAuditContext } from "@/features/audit/server";

import type { ClaimedEmailOutboxItem } from "../../types/outbox-processing.types";
import type { EmailOutboxRepository } from "../services/email-outbox-processor.service";

const DEFAULT_LOCK_TIMEOUT_MS = 5 * 60 * 1_000;
const MAX_BATCH_SIZE = 100;

interface ClaimedOutboxRow extends Record<string, unknown> {
  attempt_count: number;
  id: string;
  idempotency_key: string;
  max_attempts: number;
  payload: ClaimedEmailOutboxItem["payload"];
  recipient_email: string;
  template: ClaimedEmailOutboxItem["template"];
  version: number;
}

async function applyWorkerAuditContext(
  transaction: ApplicationTransaction,
  input: {
    reason: string;
    workerId: string;
  },
) {
  await applyVerifiedAuditContext(transaction, {
    actorAccountId: null,
    actorRole: null,
    actorType: "SYSTEM",
    reason: input.reason,
    requestId: `email-outbox:${input.workerId}`,
    source: input.workerId.startsWith("cron:") ? "CRON" : "DATABASE",
  });
}

function validateWorkerId(workerId: string) {
  const normalizedWorkerId = workerId.trim();

  if (
    normalizedWorkerId.length < 1 ||
    normalizedWorkerId.length > 100 ||
    !/^[a-zA-Z0-9._:-]+$/.test(normalizedWorkerId)
  ) {
    throw new Error("Email outbox worker ID is invalid.");
  }

  return normalizedWorkerId;
}

export function createDrizzleEmailOutboxRepository(
  dependencies: {
    database?: ApplicationDatabase;
    lockTimeoutMs?: number;
  } = {},
): EmailOutboxRepository {
  const database = dependencies.database ?? getDatabaseClient().database;
  const lockTimeoutMs = Math.max(
    1_000,
    Math.min(
      dependencies.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
      15 * 60_000,
    ),
  );

  return {
    claimDue(input) {
      const workerId = validateWorkerId(input.workerId);
      const limit = Math.max(1, Math.min(input.limit, MAX_BATCH_SIZE));
      const staleBefore = new Date(input.now.getTime() - lockTimeoutMs);
      const targetPredicate = input.outboxId
        ? sql`and item.id = ${input.outboxId}::uuid`
        : sql``;

      return database.transaction(async (transaction) => {
        await applyWorkerAuditContext(transaction, {
          reason: "Claim transactional email delivery",
          workerId,
        });

        const claimed = await transaction.execute<ClaimedOutboxRow>(sql`
          with claimable as (
            select item.id
            from public.email_outbox item
            where item.status in (
              'PENDING'::public.email_outbox_status,
              'FAILED'::public.email_outbox_status,
              'PROCESSING'::public.email_outbox_status
            )
              and item.attempt_count < item.max_attempts
              and item.due_at <= ${input.now.toISOString()}::timestamptz
              and (
                (
                  item.status in (
                    'PENDING'::public.email_outbox_status,
                    'FAILED'::public.email_outbox_status
                  )
                  and item.locked_at is null
                )
                or item.locked_at <= ${staleBefore.toISOString()}::timestamptz
              )
              ${targetPredicate}
            order by item.due_at, item.id
            for update skip locked
            limit ${limit}
          )
          update public.email_outbox item
          set
            status = 'PROCESSING'::public.email_outbox_status,
            locked_at = ${input.now.toISOString()}::timestamptz,
            locked_by = ${workerId}
          from claimable
          where item.id = claimable.id
          returning
            item.id,
            item.template::text as template,
            item.recipient_email,
            item.payload,
            item.idempotency_key,
            item.attempt_count,
            item.max_attempts,
            item.version
        `);

        return claimed.map(
          (item) =>
            ({
              attemptNumber: item.attempt_count + 1,
              claimVersion: item.version,
              id: item.id,
              idempotencyKey: item.idempotency_key,
              maxAttempts: item.max_attempts,
              payload: item.payload,
              recipientEmail: item.recipient_email,
              template: item.template,
              workerId,
            }) satisfies ClaimedEmailOutboxItem,
        );
      });
    },

    recordFailure(input) {
      return database.transaction(async (transaction) => {
        await applyWorkerAuditContext(transaction, {
          reason: "Record transactional email delivery failure",
          workerId: input.claim.workerId,
        });

        const [updated] = await transaction
          .update(emailOutbox)
          .set({
            attemptCount: input.claim.attemptNumber,
            dueAt: input.nextDueAt ?? input.completedAt,
            lastErrorCategory: input.errorCategory,
            lastErrorCode: input.errorCode,
            lockedAt: null,
            lockedBy: null,
            status: input.status,
          })
          .where(
            and(
              eq(emailOutbox.id, input.claim.id),
              eq(emailOutbox.status, "PROCESSING"),
              eq(emailOutbox.lockedBy, input.claim.workerId),
              eq(emailOutbox.version, input.claim.claimVersion),
            ),
          )
          .returning({ id: emailOutbox.id });

        if (!updated) {
          return { kind: "claim_lost" as const };
        }

        await transaction.insert(emailAttempts).values({
          attemptNumber: input.claim.attemptNumber,
          errorCategory: input.errorCategory,
          errorCode: input.errorCode,
          outboxId: input.claim.id,
          status: "FAILED",
        });

        return { kind: "recorded" as const };
      });
    },

    recordSuccess(input) {
      return database.transaction(async (transaction) => {
        await applyWorkerAuditContext(transaction, {
          reason: "Record transactional email delivery success",
          workerId: input.claim.workerId,
        });

        const [updated] = await transaction
          .update(emailOutbox)
          .set({
            attemptCount: input.claim.attemptNumber,
            lastErrorCategory: null,
            lastErrorCode: null,
            lockedAt: null,
            lockedBy: null,
            sentAt: input.completedAt,
            status: "SENT",
          })
          .where(
            and(
              eq(emailOutbox.id, input.claim.id),
              eq(emailOutbox.status, "PROCESSING"),
              eq(emailOutbox.lockedBy, input.claim.workerId),
              eq(emailOutbox.version, input.claim.claimVersion),
            ),
          )
          .returning({ id: emailOutbox.id });

        if (!updated) {
          return { kind: "claim_lost" as const };
        }

        await transaction.insert(emailAttempts).values({
          attemptNumber: input.claim.attemptNumber,
          outboxId: input.claim.id,
          providerMessageIdHash: input.providerMessageIdHash,
          responseCode: input.responseCode,
          status: "SENT",
        });

        return { kind: "recorded" as const };
      });
    },
  };
}
