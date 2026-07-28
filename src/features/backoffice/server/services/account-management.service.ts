import "server-only";

import {
  createServerVerifiedAccountTransactionRunner,
  requireAdmin,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  AccountManagementFilters,
  AccountManagementResponseDto,
} from "../../types/account-management.types";
import { listManagedAccounts } from "../repositories/drizzle-account-management.repository";

interface AccountManagementServiceDependencies {
  list(
    transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
    filters: AccountManagementFilters,
  ): Promise<AccountManagementResponseDto>;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createAccountManagementService({
  list,
  runVerifiedAccountTransaction,
}: AccountManagementServiceDependencies) {
  return {
    list(filters: AccountManagementFilters, requestId: string) {
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

export async function createServerAccountManagementService() {
  return createAccountManagementService({
    list: listManagedAccounts,
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
