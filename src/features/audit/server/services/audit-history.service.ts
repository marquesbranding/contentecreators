import "server-only";

import {
  createServerVerifiedAccountTransactionRunner,
  requireAdmin,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  AuditHistoryFilters,
  AuditHistoryResponseDto,
} from "../../types/audit-history.types";
import { listAuditHistory } from "../repositories/drizzle-audit-history.repository";

interface AuditHistoryServiceDependencies {
  list(
    transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
    filters: AuditHistoryFilters,
  ): Promise<AuditHistoryResponseDto>;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createAuditHistoryService({
  list,
  runVerifiedAccountTransaction,
}: AuditHistoryServiceDependencies) {
  return {
    list(filters: AuditHistoryFilters, requestId: string) {
      return runVerifiedAccountTransaction(
        { requestId },
        (transaction, actor) => {
          requireAdmin({
            id: actor.accountId,
            role: actor.role,
            status: actor.status,
          });

          return list(transaction, filters);
        },
      );
    },
  };
}

export async function createServerAuditHistoryService() {
  return createAuditHistoryService({
    list: listAuditHistory,
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
