import "server-only";

import {
  createServerVerifiedAccountTransactionRunner,
  requireAdmin,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  ModerationQueueFilters,
  ModerationQueueResponseDto,
} from "../../types/moderation-queue.types";
import { listModerationQueue } from "../repositories/drizzle-moderation-queue.repository";

interface ModerationQueueServiceDependencies {
  list(
    transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
    filters: ModerationQueueFilters,
  ): Promise<ModerationQueueResponseDto>;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createModerationQueueService({
  list,
  runVerifiedAccountTransaction,
}: ModerationQueueServiceDependencies) {
  return {
    list(filters: ModerationQueueFilters, requestId: string) {
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

export async function createServerModerationQueueService() {
  return createModerationQueueService({
    list: listModerationQueue,
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
