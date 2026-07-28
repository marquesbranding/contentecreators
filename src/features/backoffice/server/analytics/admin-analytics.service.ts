import "server-only";

import {
  createServerVerifiedAccountTransactionRunner,
  requireAdmin,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { resolveAdminAnalyticsPeriod } from "./admin-analytics.period";
import {
  type AdminAnalyticsRepository,
  loadAdminAnalytics,
} from "./admin-analytics.repository";
import type { AdminAnalyticsPeriodInput } from "./admin-analytics.types";

interface AdminAnalyticsServiceDependencies {
  completionVersion: number;
  load: AdminAnalyticsRepository["load"];
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createAdminAnalyticsService({
  completionVersion,
  load,
  runVerifiedAccountTransaction,
}: AdminAnalyticsServiceDependencies) {
  return {
    get(period: AdminAnalyticsPeriodInput, requestId: string) {
      return runVerifiedAccountTransaction(
        { requestId },
        (transaction, actor) => {
          requireAdmin({
            id: actor.accountId,
            role: actor.role,
            status: actor.status,
          });

          return load(
            transaction,
            resolveAdminAnalyticsPeriod(period),
            completionVersion,
          );
        },
      );
    },
  };
}

export async function createServerAdminAnalyticsService(
  completionVersion: number,
) {
  if (!Number.isInteger(completionVersion) || completionVersion < 1) {
    throw new Error("A valid shared profile completion version is required.");
  }

  return createAdminAnalyticsService({
    completionVersion,
    load: loadAdminAnalytics,
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
