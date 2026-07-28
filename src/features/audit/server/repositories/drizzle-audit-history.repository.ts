import "server-only";

import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { auditRevisions } from "@/db/schema";

import { toAuditHistoryItem } from "../../domain/audit-history-mapper";
import type {
  AuditHistoryFilters,
  AuditHistoryResponseDto,
} from "../../types/audit-history.types";

function startOfProductDay(value: string) {
  return new Date(`${value}T00:00:00.000-03:00`);
}

function endOfProductDay(value: string) {
  return new Date(`${value}T23:59:59.999-03:00`);
}

function auditPredicates(filters: AuditHistoryFilters) {
  const predicates: SQL[] = [];

  if (filters.entity) {
    predicates.push(eq(auditRevisions.entityTable, filters.entity));
  }

  if (filters.record) {
    predicates.push(eq(auditRevisions.entityId, filters.record));
  }

  if (filters.actorAccountId) {
    predicates.push(eq(auditRevisions.actorAccountId, filters.actorAccountId));
  }

  if (filters.actorType) {
    predicates.push(eq(auditRevisions.actorType, filters.actorType));
  }

  if (filters.action) {
    predicates.push(eq(auditRevisions.operation, filters.action));
  }

  if (filters.source) {
    predicates.push(eq(auditRevisions.source, filters.source));
  }

  if (filters.periodFrom) {
    predicates.push(
      gte(auditRevisions.occurredAt, startOfProductDay(filters.periodFrom)),
    );
  }

  if (filters.periodTo) {
    predicates.push(
      lte(auditRevisions.occurredAt, endOfProductDay(filters.periodTo)),
    );
  }

  return predicates.length > 0 ? and(...predicates) : undefined;
}

export async function listAuditHistory(
  transaction: ApplicationTransaction,
  filters: AuditHistoryFilters,
): Promise<AuditHistoryResponseDto> {
  const where = auditPredicates(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const [rows, totalRows] = await Promise.all([
    transaction
      .select({
        actorAccountId: auditRevisions.actorAccountId,
        actorRole: auditRevisions.actorRole,
        actorType: auditRevisions.actorType,
        afterState: auditRevisions.afterState,
        beforeState: auditRevisions.beforeState,
        changedFields: auditRevisions.changedFields,
        entityId: auditRevisions.entityId,
        entityTable: auditRevisions.entityTable,
        occurredAt: auditRevisions.occurredAt,
        operation: auditRevisions.operation,
        reason: auditRevisions.reason,
        requestId: auditRevisions.requestId,
        revision: auditRevisions.revision,
        source: auditRevisions.source,
      })
      .from(auditRevisions)
      .where(where)
      .orderBy(desc(auditRevisions.occurredAt), desc(auditRevisions.revision))
      .limit(filters.pageSize)
      .offset(offset),
    transaction.select({ value: count() }).from(auditRevisions).where(where),
  ]);
  const totalItems = totalRows[0]?.value ?? 0;

  return {
    items: rows.map((row) =>
      toAuditHistoryItem({
        ...row,
        occurredAt:
          row.occurredAt instanceof Date
            ? row.occurredAt
            : new Date(row.occurredAt),
      }),
    ),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / filters.pageSize),
    },
  };
}
