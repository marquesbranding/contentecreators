import "server-only";

import { sql } from "drizzle-orm";

import type { ApplicationDatabase, ApplicationTransaction } from "@/db/client";

import {
  auditContextSchema,
  type VerifiedAuditContext,
} from "../../schemas/audit-context-schema";

export async function applyVerifiedAuditContext(
  transaction: ApplicationTransaction,
  contextInput: VerifiedAuditContext,
) {
  const context = auditContextSchema.parse(contextInput);

  await transaction.execute(sql`
    select
      set_config('app.audit.actor_account_id', ${context.actorAccountId ?? ""}, true),
      set_config('app.audit.actor_type', ${context.actorType}, true),
      set_config('app.audit.actor_role', ${context.actorRole ?? ""}, true),
      set_config('app.audit.source', ${context.source}, true),
      set_config('app.audit.request_id', ${context.requestId}, true),
      set_config('app.audit.reason', ${context.reason ?? ""}, true)
  `);
}

export function createAuditedTransactionRunner(database: ApplicationDatabase) {
  return async function withAuditedTransaction<T>(
    contextInput: VerifiedAuditContext,
    work: (transaction: ApplicationTransaction) => Promise<T>,
  ): Promise<T> {
    return database.transaction(async (transaction) => {
      await applyVerifiedAuditContext(transaction, contextInput);

      return work(transaction);
    });
  };
}
