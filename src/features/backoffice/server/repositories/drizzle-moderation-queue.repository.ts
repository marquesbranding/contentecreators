import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { accounts, companyProfiles, creatorProfiles } from "@/db/schema";

import type {
  ModerationQueueFilters,
  ModerationQueueResponseDto,
  ModerationQueueRole,
  ModerationQueueStatus,
} from "../../types/moderation-queue.types";

const queueStatuses: ModerationQueueStatus[] = [
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
];
const submittedStatuses: ModerationQueueStatus[] = [
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SUSPENDED",
  "BANNED",
];
const roles: ModerationQueueRole[] = ["INFLUENCER", "COMPANY"];

function isQueueRole(role: string | null): role is ModerationQueueRole {
  return role === "INFLUENCER" || role === "COMPANY";
}

function isSubmittedStatus(status: string): status is ModerationQueueStatus {
  return submittedStatuses.includes(status as ModerationQueueStatus);
}

function displayNameExpression() {
  return sql<string>`coalesce(
    ${creatorProfiles.displayName},
    ${companyProfiles.tradeName},
    'Cadastro sem nome'
  )`;
}

function listPredicates(filters: ModerationQueueFilters) {
  const predicates: (SQL | undefined)[] = [
    eq(accounts.role, filters.role),
    inArray(accounts.status, submittedStatuses),
    isNotNull(accounts.submittedAt),
    isNull(accounts.archivedAt),
  ];

  if (filters.status) {
    predicates.push(eq(accounts.status, filters.status));
  }

  if (filters.search) {
    const normalizedSearch = sql`public.normalize_search_text(${filters.search})`;
    const numericSearch = filters.search.replaceAll(/\D/gu, "");
    const searchPredicates: SQL[] = [
      sql`${creatorProfiles.searchDocument} like '%' || ${normalizedSearch} || '%'`,
      sql`${companyProfiles.searchDocument} like '%' || ${normalizedSearch} || '%'`,
      sql`public.normalize_search_text(${accounts.operationalEmail}) like '%' || ${normalizedSearch} || '%'`,
    ];

    if (numericSearch) {
      searchPredicates.push(
        sql`${companyProfiles.cnpj} like '%' || ${numericSearch} || '%'`,
      );
    }

    predicates.push(or(...searchPredicates));
  }

  return and(...predicates);
}

function listOrder(filters: ModerationQueueFilters): SQL[] {
  const displayName = displayNameExpression();

  if (filters.order === "OLDEST_SUBMITTED") {
    return [asc(accounts.submittedAt), asc(displayName), asc(accounts.id)];
  }

  if (filters.order === "NEWEST_SUBMITTED") {
    return [desc(accounts.submittedAt), asc(displayName), asc(accounts.id)];
  }

  if (filters.order === "NAME_ASC") {
    return [asc(displayName), asc(accounts.submittedAt), asc(accounts.id)];
  }

  return [
    asc(sql`case
      when ${accounts.status} = 'PENDING_REVIEW' then 0
      when ${accounts.status} = 'CHANGES_REQUESTED' then 1
      else 2
    end`),
    asc(accounts.submittedAt),
    asc(displayName),
    asc(accounts.id),
  ];
}

function emptyStatusCounts(): Record<ModerationQueueStatus, number> {
  return {
    APPROVED: 0,
    BANNED: 0,
    CHANGES_REQUESTED: 0,
    PENDING_REVIEW: 0,
    SUSPENDED: 0,
  };
}

function serializeSubmittedAt(value: Date | string | null): string {
  if (!value) {
    throw new Error("Moderation queue item is missing its submission date.");
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Moderation queue item has an invalid submission date.");
  }

  return date.toISOString();
}

export async function listModerationQueue(
  transaction: ApplicationTransaction,
  filters: ModerationQueueFilters,
): Promise<ModerationQueueResponseDto> {
  const where = listPredicates(filters);
  const offset = (filters.page - 1) * filters.pageSize;

  const [items, totals, countRows] = await Promise.all([
    transaction
      .select({
        accountId: accounts.id,
        accountVersion: accounts.version,
        completionPercentage: accounts.completionPercentage,
        completionVersion: accounts.completionVersion,
        displayName: displayNameExpression(),
        profileVersion: sql<number>`coalesce(
          ${creatorProfiles.version},
          ${companyProfiles.version},
          1
        )`,
        role: accounts.role,
        status: accounts.status,
        submittedAt: accounts.submittedAt,
      })
      .from(accounts)
      .leftJoin(
        creatorProfiles,
        and(
          eq(creatorProfiles.accountId, accounts.id),
          isNull(creatorProfiles.archivedAt),
        ),
      )
      .leftJoin(
        companyProfiles,
        and(
          eq(companyProfiles.accountId, accounts.id),
          isNull(companyProfiles.archivedAt),
        ),
      )
      .where(where)
      .orderBy(...listOrder(filters))
      .limit(filters.pageSize)
      .offset(offset),
    transaction
      .select({ value: count() })
      .from(accounts)
      .leftJoin(
        creatorProfiles,
        and(
          eq(creatorProfiles.accountId, accounts.id),
          isNull(creatorProfiles.archivedAt),
        ),
      )
      .leftJoin(
        companyProfiles,
        and(
          eq(companyProfiles.accountId, accounts.id),
          isNull(companyProfiles.archivedAt),
        ),
      )
      .where(where),
    transaction
      .select({
        role: accounts.role,
        status: accounts.status,
        value: count(),
      })
      .from(accounts)
      .where(
        and(
          inArray(accounts.role, roles),
          inArray(accounts.status, submittedStatuses),
          isNotNull(accounts.submittedAt),
          isNull(accounts.archivedAt),
        ),
      )
      .groupBy(accounts.role, accounts.status),
  ]);

  const totalItems = totals[0]?.value ?? 0;
  const byRole: Record<ModerationQueueRole, number> = {
    COMPANY: 0,
    INFLUENCER: 0,
  };
  const byStatus = emptyStatusCounts();

  for (const row of countRows) {
    if (!isQueueRole(row.role) || !isSubmittedStatus(row.status)) {
      continue;
    }

    if (queueStatuses.includes(row.status)) {
      byRole[row.role] += row.value;
    }

    if (row.role === filters.role) {
      byStatus[row.status] = row.value;
    }
  }

  return {
    counts: { byRole, byStatus },
    items: items.map((item) => ({
      accountId: item.accountId,
      accountVersion: item.accountVersion,
      completionPercentage: item.completionPercentage,
      completionVersion: item.completionVersion,
      displayName: item.displayName,
      profileVersion: item.profileVersion,
      role: item.role as ModerationQueueRole,
      status: item.status as ModerationQueueStatus,
      submittedAt: serializeSubmittedAt(item.submittedAt),
    })),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / filters.pageSize),
    },
  };
}
