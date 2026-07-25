import "server-only";

import { sql } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { applyVerifiedAuditContext } from "@/features/audit/server";
import {
  createServerVerifiedAccountTransactionRunner,
  requireAdmin,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { AdminEmailRetryCommand } from "../../schemas/admin-email-retry-schema";
import type { AdminEmailRetryScheduleResult } from "../services/admin-email-retry.service";

interface AdminEmailRetryRow extends Record<string, unknown> {
  outbox_id: string | null;
  result_kind:
    | "ALREADY_SCHEDULED"
    | "ALREADY_SENT"
    | "NOT_FOUND"
    | "NOT_RETRYABLE"
    | "SCHEDULED";
}

async function applyAdminAuditContext(
  transaction: ApplicationTransaction,
  actorAccountId: string,
  command: AdminEmailRetryCommand,
) {
  await applyVerifiedAuditContext(transaction, {
    actorAccountId,
    actorRole: "ADMIN",
    actorType: "ADMIN",
    reason: command.reason,
    requestId: command.requestId,
    source: "BACKOFFICE",
  });
}

export function createDrizzleAdminEmailRetryRepository({
  runVerifiedTransaction,
}: {
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}) {
  return {
    scheduleRetry(
      command: AdminEmailRetryCommand,
    ): Promise<AdminEmailRetryScheduleResult> {
      return runVerifiedTransaction(
        { requestId: command.requestId },
        async (transaction, actor) => {
          requireAdmin({
            id: actor.accountId,
            role: actor.role,
            status: actor.status,
          });
          await applyAdminAuditContext(transaction, actor.accountId, command);

          const [result] = await transaction.execute<AdminEmailRetryRow>(sql`
              with current_item as materialized (
                select
                  outbox.id,
                  outbox.status,
                  outbox.max_attempts
                from public.email_outbox outbox
                where outbox.id = ${command.outboxId}::uuid
                for update
              ),
              scheduled as (
                update public.email_outbox outbox
                set
                  status = 'PENDING'::public.email_outbox_status,
                  due_at = clock_timestamp(),
                  locked_at = null,
                  locked_by = null,
                  max_attempts = least(outbox.max_attempts + 1, 20)
                where outbox.id = ${command.outboxId}::uuid
                  and outbox.status = 'DEAD_LETTER'::public.email_outbox_status
                  and outbox.sent_at is null
                  and outbox.max_attempts < 20
                returning outbox.id
              )
              select
                coalesce(scheduled.id, current_item.id) as outbox_id,
                case
                  when scheduled.id is not null then 'SCHEDULED'
                  when current_item.id is null then 'NOT_FOUND'
                  when current_item.status = 'SENT'::public.email_outbox_status
                    then 'ALREADY_SENT'
                  when current_item.status in (
                    'PENDING'::public.email_outbox_status,
                    'PROCESSING'::public.email_outbox_status,
                    'FAILED'::public.email_outbox_status
                  )
                    then 'ALREADY_SCHEDULED'
                  else 'NOT_RETRYABLE'
                end as result_kind
              from (select 1) anchor
              left join current_item on true
              left join scheduled on true
            `);

          if (!result) {
            throw new Error("Email retry scheduling returned no result.");
          }

          if (result.result_kind === "SCHEDULED") {
            if (!result.outbox_id) {
              throw new Error(
                "Scheduled email retry returned no outbox identity.",
              );
            }

            return {
              kind: "scheduled",
              outboxId: result.outbox_id,
            };
          }

          const resultKinds = {
            ALREADY_SCHEDULED: "already_scheduled",
            ALREADY_SENT: "already_sent",
            NOT_FOUND: "not_found",
            NOT_RETRYABLE: "not_retryable",
          } as const;

          return {
            kind: resultKinds[result.result_kind],
          };
        },
      );
    },
  };
}

export async function createServerAdminEmailRetryRepository() {
  return createDrizzleAdminEmailRetryRepository({
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
