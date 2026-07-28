import "server-only";

import {
  createServerVerifiedAccountTransactionRunner,
  requireAdmin,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  AdminEmailOutboxDetailDto,
  AdminEmailOutboxFilters,
  AdminEmailOutboxListDto,
} from "../../types/admin-email-outbox.types";
import {
  findAdminEmailOutboxDetail,
  listAdminEmailOutbox,
} from "../repositories/drizzle-admin-email-outbox.repository";

type Transaction = Parameters<
  Parameters<VerifiedAccountTransactionRunner>[1]
>[0];

interface AdminEmailOutboxServiceDependencies {
  findDetail(
    transaction: Transaction,
    outboxId: string,
  ): Promise<AdminEmailOutboxDetailDto | null>;
  list(
    transaction: Transaction,
    filters: AdminEmailOutboxFilters,
  ): Promise<AdminEmailOutboxListDto>;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createAdminEmailOutboxService({
  findDetail,
  list,
  runVerifiedAccountTransaction,
}: AdminEmailOutboxServiceDependencies) {
  function runAuthorized<T>(
    requestId: string,
    operation: (transaction: Transaction) => Promise<T>,
  ) {
    return runVerifiedAccountTransaction(
      { requestId },
      (transaction, actor) => {
        requireAdmin({
          id: actor.accountId,
          role: actor.role,
          status: actor.status,
        });

        return operation(transaction);
      },
    );
  }

  return {
    findDetail(outboxId: string, requestId: string) {
      return runAuthorized(requestId, (transaction) =>
        findDetail(transaction, outboxId),
      );
    },
    list(filters: AdminEmailOutboxFilters, requestId: string) {
      return runAuthorized(requestId, (transaction) =>
        list(transaction, filters),
      );
    },
  };
}

export async function createServerAdminEmailOutboxService() {
  return createAdminEmailOutboxService({
    findDetail: findAdminEmailOutboxDetail,
    list: listAdminEmailOutbox,
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
