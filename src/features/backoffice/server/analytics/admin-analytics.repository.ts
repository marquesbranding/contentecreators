import "server-only";

import { and, count, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { accounts } from "@/db/schema";

import {
  ADMIN_ANALYTICS_ROLES,
  ADMIN_ANALYTICS_STATUSES,
  type AdminAnalyticsDto,
  type AdminAnalyticsQueryBounds,
  type AdminAnalyticsRole,
  type AdminAnalyticsStatus,
  type AdminAnalyticsStatusCounts,
} from "./admin-analytics.types";

export interface AdminAnalyticsAggregateRows {
  completion: {
    averagePercentage: number;
    completedProfiles: number;
    profileCount: number;
    version: number;
  };
  newRegistrations: {
    role: string | null;
    total: number;
  }[];
  roleStatuses: {
    role: string | null;
    status: string;
    total: number;
  }[];
}

export interface AdminAnalyticsRepository {
  load(
    transaction: ApplicationTransaction,
    bounds: AdminAnalyticsQueryBounds,
    completionVersion: number,
  ): Promise<AdminAnalyticsDto>;
}

function isAnalyticsRole(value: string | null): value is AdminAnalyticsRole {
  return (
    value !== null &&
    ADMIN_ANALYTICS_ROLES.includes(value as AdminAnalyticsRole)
  );
}

function isAnalyticsStatus(value: string): value is AdminAnalyticsStatus {
  return ADMIN_ANALYTICS_STATUSES.includes(value as AdminAnalyticsStatus);
}

function emptyStatusCounts(): AdminAnalyticsStatusCounts {
  return {
    APPROVED: 0,
    BANNED: 0,
    CHANGES_REQUESTED: 0,
    ONBOARDING: 0,
    PENDING_REVIEW: 0,
    SUSPENDED: 0,
  };
}

export function composeAdminAnalyticsDto(
  rows: AdminAnalyticsAggregateRows,
  bounds: AdminAnalyticsQueryBounds,
): AdminAnalyticsDto {
  const byRole = {
    COMPANY: { byStatus: emptyStatusCounts(), total: 0 },
    INFLUENCER: { byStatus: emptyStatusCounts(), total: 0 },
  };

  for (const row of rows.roleStatuses) {
    if (!isAnalyticsRole(row.role) || !isAnalyticsStatus(row.status)) {
      continue;
    }

    byRole[row.role].byStatus[row.status] += row.total;
    byRole[row.role].total += row.total;
  }

  const registrationByRole = { COMPANY: 0, INFLUENCER: 0 };

  for (const row of rows.newRegistrations) {
    if (isAnalyticsRole(row.role)) {
      registrationByRole[row.role] += row.total;
    }
  }

  return {
    byRole,
    completion: {
      calculatorVersion: rows.completion.version,
      completedProfiles: rows.completion.completedProfiles,
      percentage: rows.completion.averagePercentage,
      totalProfiles: rows.completion.profileCount,
    },
    newRegistrations: {
      byRole: registrationByRole,
      total: registrationByRole.INFLUENCER + registrationByRole.COMPANY,
    },
    period: bounds.period,
    totals: {
      awaitingApproval:
        byRole.INFLUENCER.byStatus.PENDING_REVIEW +
        byRole.COMPANY.byStatus.PENDING_REVIEW,
      companies: byRole.COMPANY.total,
      influencers: byRole.INFLUENCER.total,
    },
  };
}

export async function loadAdminAnalytics(
  transaction: ApplicationTransaction,
  bounds: AdminAnalyticsQueryBounds,
  completionVersion: number,
) {
  const activeProfileScope = and(
    isNull(accounts.archivedAt),
    inArray(accounts.role, ADMIN_ANALYTICS_ROLES),
  );
  const roleStatuses = await transaction
    .select({
      role: accounts.role,
      status: accounts.status,
      total: count(),
    })
    .from(accounts)
    .where(activeProfileScope)
    .groupBy(accounts.role, accounts.status);
  const newRegistrations = await transaction
    .select({
      role: accounts.role,
      total: count(),
    })
    .from(accounts)
    .where(
      and(
        activeProfileScope,
        gte(accounts.createdAt, bounds.startUtc),
        lt(accounts.createdAt, bounds.endUtcExclusive),
      ),
    )
    .groupBy(accounts.role);
  const [completionRow] = await transaction
    .select({
      averagePercentage: sql<number>`coalesce(round(avg(${accounts.completionPercentage})), 0)::integer`,
      completedProfiles: sql<number>`count(*) filter (where ${accounts.completionPercentage} = 100)::integer`,
      profileCount: sql<number>`count(*)::integer`,
    })
    .from(accounts)
    .where(
      and(
        activeProfileScope,
        eq(accounts.completionVersion, completionVersion),
      ),
    );

  return composeAdminAnalyticsDto(
    {
      completion: {
        averagePercentage: completionRow?.averagePercentage ?? 0,
        completedProfiles: completionRow?.completedProfiles ?? 0,
        profileCount: completionRow?.profileCount ?? 0,
        version: completionVersion,
      },
      newRegistrations,
      roleStatuses,
    },
    bounds,
  );
}
