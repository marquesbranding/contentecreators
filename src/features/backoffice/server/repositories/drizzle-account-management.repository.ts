import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { accounts, companyProfiles, creatorProfiles } from "@/db/schema";

import type {
  AccountManagementFilters,
  AccountManagementResponseDto,
  ManagedAccountRole,
  ManagedAccountStatus,
} from "../../types/account-management.types";

function displayNameExpression() {
  return sql<string>`coalesce(
    ${creatorProfiles.displayName},
    ${companyProfiles.tradeName},
    nullif(split_part(${accounts.operationalEmail}, '@', 1), ''),
    'Cadastro sem nome'
  )`;
}

function listPredicates(filters: AccountManagementFilters) {
  const predicates: (SQL | undefined)[] = [];

  if (filters.role) {
    predicates.push(eq(accounts.role, filters.role));
  }

  if (filters.status) {
    predicates.push(eq(accounts.status, filters.status));
  }

  if (filters.archive === "ACTIVE") {
    predicates.push(isNull(accounts.archivedAt));
  } else if (filters.archive === "ARCHIVED") {
    predicates.push(isNotNull(accounts.archivedAt));
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

  return predicates.length ? and(...predicates) : undefined;
}

function listOrder(filters: AccountManagementFilters): SQL[] {
  const displayName = displayNameExpression();

  if (filters.order === "OLDEST") {
    return [asc(accounts.createdAt), asc(accounts.id)];
  }

  if (filters.order === "NAME_ASC") {
    return [asc(displayName), desc(accounts.createdAt), asc(accounts.id)];
  }

  if (filters.order === "COMPLETION_DESC") {
    return [
      desc(accounts.completionPercentage),
      asc(displayName),
      asc(accounts.id),
    ];
  }

  return [desc(accounts.createdAt), asc(accounts.id)];
}

function toIso(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Managed account has an invalid date.");
  }

  return date.toISOString();
}

export async function listManagedAccounts(
  transaction: ApplicationTransaction,
  filters: AccountManagementFilters,
): Promise<AccountManagementResponseDto> {
  const where = listPredicates(filters);
  const offset = (filters.page - 1) * filters.pageSize;

  const [items, totals] = await Promise.all([
    transaction
      .select({
        accountId: accounts.id,
        archivedAt: accounts.archivedAt,
        completionPercentage: accounts.completionPercentage,
        createdAt: accounts.createdAt,
        displayName: displayNameExpression(),
        operationalEmail: accounts.operationalEmail,
        role: accounts.role,
        status: accounts.status,
        updatedAt: accounts.updatedAt,
        version: accounts.version,
      })
      .from(accounts)
      .leftJoin(creatorProfiles, eq(creatorProfiles.accountId, accounts.id))
      .leftJoin(companyProfiles, eq(companyProfiles.accountId, accounts.id))
      .where(where)
      .orderBy(...listOrder(filters))
      .limit(filters.pageSize)
      .offset(offset),
    transaction
      .select({ value: count() })
      .from(accounts)
      .leftJoin(creatorProfiles, eq(creatorProfiles.accountId, accounts.id))
      .leftJoin(companyProfiles, eq(companyProfiles.accountId, accounts.id))
      .where(where),
  ]);

  const totalItems = totals[0]?.value ?? 0;

  return {
    items: items.map((item) => ({
      accountId: item.accountId,
      archivedAt: toIso(item.archivedAt),
      completionPercentage: item.completionPercentage,
      createdAt: toIso(item.createdAt) as string,
      displayName: item.displayName,
      operationalEmail: item.operationalEmail,
      role: item.role as ManagedAccountRole | null,
      status: item.status as ManagedAccountStatus,
      updatedAt: toIso(item.updatedAt) as string,
      version: item.version,
    })),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / filters.pageSize),
    },
  };
}
