import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import { getDatabaseClient } from "@/db/client";

import type { VerifiedAuditContext } from "../../schemas/audit-context-schema";
import { createAuditedTransactionRunner } from "../services/audited-transaction";

export function withAuditedTransaction<T>(
  context: VerifiedAuditContext,
  work: (transaction: ApplicationTransaction) => Promise<T>,
) {
  const { database } = getDatabaseClient();
  const runAuditedTransaction = createAuditedTransactionRunner(database);

  return runAuditedTransaction(context, work);
}
