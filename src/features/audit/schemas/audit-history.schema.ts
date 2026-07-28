import { z } from "zod";

import type { AuditHistoryFilters } from "../types/audit-history.types";

export const AUDIT_HISTORY_DEFAULT_PAGE_SIZE = 20;
export const AUDIT_HISTORY_MAX_PAGE_SIZE = 50;
export const AUDIT_HISTORY_MAX_PAGE = 1_000;

export const auditHistoryActionSchema = z.enum([
  "INSERT",
  "UPDATE",
  "ARCHIVE",
  "RESTORE",
  "DELETE",
  "PRIVILEGED_READ",
]);
export const auditHistoryActorTypeSchema = z.enum([
  "USER",
  "ADMIN",
  "SYSTEM",
  "SYSTEM_UNKNOWN",
]);
export const auditHistorySourceSchema = z.enum([
  "APPLICATION",
  "BACKOFFICE",
  "AUTH_HOOK",
  "CRON",
  "SCRIPT",
  "DATABASE",
]);

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "Use uma data válida.")
    .refine(
      (value) => !Number.isNaN(new Date(`${value}T12:00:00.000Z`).getTime()),
      "Use uma data válida.",
    )
    .optional(),
);

const boundedIntegerFromUrl = (fallback: number, maximum: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : Number(value)),
    z.number().int().positive().max(maximum),
  );

const auditHistoryFiltersInputSchema = z
  .object({
    action: z.preprocess(emptyToUndefined, auditHistoryActionSchema.optional()),
    actorAccountId: z.preprocess(
      emptyToUndefined,
      z.uuid("Informe um ID de conta válido.").optional(),
    ),
    actorType: z.preprocess(
      emptyToUndefined,
      auditHistoryActorTypeSchema.optional(),
    ),
    entity: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(100)
        .regex(/^[a-z][a-z0-9_]*$/u, "Informe uma entidade válida.")
        .optional(),
    ),
    page: boundedIntegerFromUrl(1, AUDIT_HISTORY_MAX_PAGE),
    pageSize: boundedIntegerFromUrl(
      AUDIT_HISTORY_DEFAULT_PAGE_SIZE,
      AUDIT_HISTORY_MAX_PAGE_SIZE,
    ),
    periodFrom: optionalDate,
    periodTo: optionalDate,
    record: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(1).max(200).optional(),
    ),
    source: z.preprocess(emptyToUndefined, auditHistorySourceSchema.optional()),
  })
  .refine(
    ({ periodFrom, periodTo }) =>
      !periodFrom || !periodTo || periodFrom <= periodTo,
    {
      message: "A data inicial deve ser anterior à data final.",
      path: ["periodTo"],
    },
  );

export const auditHistoryFiltersSchema = auditHistoryFiltersInputSchema;

const auditDisplayValueSchema = z.json();

const auditHistoryItemSchema = z
  .object({
    action: auditHistoryActionSchema,
    actor: z
      .object({
        accountId: z.uuid().nullable(),
        actorType: auditHistoryActorTypeSchema,
        role: z.enum(["ADMIN", "INFLUENCER", "COMPANY"]).nullable(),
      })
      .strict(),
    changes: z.array(
      z
        .object({
          after: auditDisplayValueSchema,
          before: auditDisplayValueSchema,
          field: z.string().trim().min(1).max(100),
        })
        .strict(),
    ),
    entity: z.string().trim().min(1).max(100),
    occurredAt: z.iso.datetime({ offset: true }),
    reason: z.string().max(2_000).nullable(),
    record: z.string().trim().min(1).max(200),
    requestId: z.string().trim().min(1).max(128).nullable(),
    revision: z.number().int().positive(),
    source: auditHistorySourceSchema,
  })
  .strict();

export const auditHistoryResponseSchema = z
  .object({
    items: z.array(auditHistoryItemSchema),
    pagination: z
      .object({
        page: z.number().int().positive().max(AUDIT_HISTORY_MAX_PAGE),
        pageSize: z.number().int().positive().max(AUDIT_HISTORY_MAX_PAGE_SIZE),
        totalItems: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export function parseAuditHistorySearchParams(searchParams: URLSearchParams) {
  return auditHistoryFiltersSchema.parse(
    Object.fromEntries(searchParams.entries()),
  );
}

export function serializeAuditHistoryFilters(
  input: Partial<AuditHistoryFilters>,
) {
  const filters = auditHistoryFiltersSchema.parse(input);
  const searchParams = new URLSearchParams();

  for (const key of [
    "entity",
    "record",
    "actorAccountId",
    "actorType",
    "action",
    "source",
    "periodFrom",
    "periodTo",
  ] as const) {
    const value = filters[key];

    if (value) {
      searchParams.set(key, value);
    }
  }

  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));

  return searchParams;
}

export type AuditHistoryFiltersInput = Partial<AuditHistoryFilters>;
