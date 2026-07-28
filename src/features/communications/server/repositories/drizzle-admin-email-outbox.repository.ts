import "server-only";

import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { emailAttempts, emailOutbox } from "@/db/schema";

import type {
  AdminEmailOutboxDetailDto,
  AdminEmailOutboxFilters,
  AdminEmailOutboxListDto,
  AdminEmailOutboxStatus,
} from "../../types/admin-email-outbox.types";
import {
  mapAdminEmailAttempt,
  mapAdminEmailOutboxItem,
  type AdminEmailAttemptSafeRow,
  type AdminEmailOutboxSafeRow,
} from "../mappers/admin-email-outbox.mapper";

const operationalStatuses: AdminEmailOutboxStatus[] = [
  "PENDING",
  "FAILED",
  "DEAD_LETTER",
];

function listPredicates(filters: AdminEmailOutboxFilters) {
  const predicates: SQL[] = [inArray(emailOutbox.status, operationalStatuses)];

  if (filters.status) {
    predicates.push(eq(emailOutbox.status, filters.status));
  }

  if (filters.template) {
    predicates.push(eq(emailOutbox.template, filters.template));
  }

  return and(...predicates);
}

function listOrder(filters: AdminEmailOutboxFilters): SQL[] {
  if (filters.order === "NEWEST") {
    return [desc(emailOutbox.createdAt), asc(emailOutbox.id)];
  }

  if (filters.order === "OLDEST") {
    return [asc(emailOutbox.createdAt), asc(emailOutbox.id)];
  }

  if (filters.order === "NEXT_DUE") {
    return [asc(emailOutbox.dueAt), asc(emailOutbox.id)];
  }

  return [
    asc(sql`case
      when ${emailOutbox.status} = 'DEAD_LETTER' then 0
      when ${emailOutbox.status} = 'FAILED' then 1
      else 2
    end`),
    asc(emailOutbox.dueAt),
    asc(emailOutbox.id),
  ];
}

function emptyCounts(): Record<AdminEmailOutboxStatus, number> {
  return { DEAD_LETTER: 0, FAILED: 0, PENDING: 0 };
}

function toSafeRow(
  row: Omit<AdminEmailOutboxSafeRow, "status" | "template"> & {
    status: string;
    template: string;
  },
): AdminEmailOutboxSafeRow {
  if (!operationalStatuses.includes(row.status as AdminEmailOutboxStatus)) {
    throw new Error("Email outbox query returned a non-operational status.");
  }

  return {
    ...row,
    status: row.status as AdminEmailOutboxStatus,
    template: row.template as AdminEmailOutboxSafeRow["template"],
  };
}

function selectSafeItemFields() {
  return {
    accountId: emailOutbox.accountId,
    attemptCount: emailOutbox.attemptCount,
    createdAt: emailOutbox.createdAt,
    dueAt: emailOutbox.dueAt,
    id: emailOutbox.id,
    maxAttempts: emailOutbox.maxAttempts,
    sentAt: emailOutbox.sentAt,
    status: emailOutbox.status,
    template: emailOutbox.template,
    updatedAt: emailOutbox.updatedAt,
  };
}

export async function listAdminEmailOutbox(
  transaction: ApplicationTransaction,
  filters: AdminEmailOutboxFilters,
): Promise<AdminEmailOutboxListDto> {
  const where = listPredicates(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const [items, totals, countRows] = await Promise.all([
    transaction
      .select(selectSafeItemFields())
      .from(emailOutbox)
      .where(where)
      .orderBy(...listOrder(filters))
      .limit(filters.pageSize)
      .offset(offset),
    transaction.select({ value: count() }).from(emailOutbox).where(where),
    transaction
      .select({ status: emailOutbox.status, value: count() })
      .from(emailOutbox)
      .where(inArray(emailOutbox.status, operationalStatuses))
      .groupBy(emailOutbox.status),
  ]);
  const counts = emptyCounts();

  for (const row of countRows) {
    if (operationalStatuses.includes(row.status as AdminEmailOutboxStatus)) {
      counts[row.status as AdminEmailOutboxStatus] = row.value;
    }
  }

  const totalItems = totals[0]?.value ?? 0;

  return {
    counts,
    items: items.map((item) => mapAdminEmailOutboxItem(toSafeRow(item))),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / filters.pageSize),
    },
  };
}

export async function findAdminEmailOutboxDetail(
  transaction: ApplicationTransaction,
  outboxId: string,
): Promise<AdminEmailOutboxDetailDto | null> {
  const [item] = await transaction
    .select(selectSafeItemFields())
    .from(emailOutbox)
    .where(
      and(
        eq(emailOutbox.id, outboxId),
        inArray(emailOutbox.status, operationalStatuses),
      ),
    )
    .limit(1);

  if (!item) {
    return null;
  }

  const attempts = await transaction
    .select({
      attemptNumber: emailAttempts.attemptNumber,
      attemptedAt: emailAttempts.attemptedAt,
      errorCategory: emailAttempts.errorCategory,
      latencyMs: emailAttempts.latencyMs,
      status: emailAttempts.status,
    })
    .from(emailAttempts)
    .where(eq(emailAttempts.outboxId, outboxId))
    .orderBy(desc(emailAttempts.attemptNumber), desc(emailAttempts.id))
    .limit(20);

  return {
    attempts: attempts.map((attempt) =>
      mapAdminEmailAttempt(attempt as AdminEmailAttemptSafeRow),
    ),
    item: mapAdminEmailOutboxItem(toSafeRow(item)),
  };
}
