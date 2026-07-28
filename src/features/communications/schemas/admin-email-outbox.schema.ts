import { z } from "zod";

import type { AdminEmailOutboxFilters } from "../types/admin-email-outbox.types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const adminEmailOutboxStatusSchema = z.enum([
  "PENDING",
  "FAILED",
  "DEAD_LETTER",
]);
export const adminEmailTemplateSchema = z.enum([
  "ONBOARDING_RECEIVED",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SUSPENDED",
  "RESTORED",
  "BANNED",
]);
export const adminEmailOutboxOrderSchema = z.enum([
  "ATTENTION_FIRST",
  "NEXT_DUE",
  "OLDEST",
  "NEWEST",
]);

const positiveIntegerFromUrl = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : Number(value)),
    z.number().int().positive(),
  );

const adminEmailOutboxFiltersInputSchema = z.object({
  order: adminEmailOutboxOrderSchema.default("ATTENTION_FIRST"),
  page: positiveIntegerFromUrl(1),
  pageSize: positiveIntegerFromUrl(DEFAULT_PAGE_SIZE).transform((value) =>
    Math.min(value, MAX_PAGE_SIZE),
  ),
  status: adminEmailOutboxStatusSchema.optional(),
  template: adminEmailTemplateSchema.optional(),
});

export const adminEmailOutboxFiltersSchema =
  adminEmailOutboxFiltersInputSchema.transform((filters) => ({
    order: filters.order,
    page: filters.page,
    pageSize: filters.pageSize,
    status: filters.status,
    template: filters.template,
  }));

const retryEligibilitySchema = z.discriminatedUnion("eligible", [
  z
    .object({
      eligible: z.literal(true),
      reason: z.literal("ELIGIBLE"),
    })
    .strict(),
  z
    .object({
      eligible: z.literal(false),
      reason: z.enum(["AUTOMATIC_RETRY", "LIMIT_REACHED", "PENDING_DELIVERY"]),
    })
    .strict(),
]);

export const adminEmailOutboxItemSchema = z
  .object({
    attemptCount: z.number().int().nonnegative(),
    createdAt: z.iso.datetime({ offset: true }),
    dueAt: z.iso.datetime({ offset: true }),
    id: z.uuid(),
    maxAttempts: z.number().int().positive().max(20),
    recipientReference: z
      .string()
      .regex(/^(?:Conta [a-f0-9]{8}|Destino do sistema)$/u),
    reference: z.string().regex(/^E-mail #[a-f0-9]{8}$/u),
    retry: retryEligibilitySchema,
    status: adminEmailOutboxStatusSchema,
    template: adminEmailTemplateSchema,
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const adminEmailAttemptDetailSchema = z
  .object({
    attemptNumber: z.number().int().positive(),
    attemptedAt: z.iso.datetime({ offset: true }),
    latencyMs: z.number().int().nonnegative().nullable(),
    outcome: z.enum([
      "AUTHENTICATION_FAILURE",
      "CONNECTION_FAILURE",
      "DELIVERED",
      "OTHER_FAILURE",
      "RECIPIENT_FAILURE",
      "TEMPLATE_FAILURE",
      "TIMEOUT_FAILURE",
      "TLS_FAILURE",
    ]),
    status: z.enum(["SENT", "FAILED"]),
  })
  .strict();

export const adminEmailOutboxListSchema = z
  .object({
    counts: z
      .object({
        DEAD_LETTER: z.number().int().nonnegative(),
        FAILED: z.number().int().nonnegative(),
        PENDING: z.number().int().nonnegative(),
      })
      .strict(),
    items: z.array(adminEmailOutboxItemSchema),
    pagination: z
      .object({
        page: z.number().int().positive(),
        pageSize: z.number().int().positive().max(MAX_PAGE_SIZE),
        totalItems: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const adminEmailOutboxDetailSchema = z
  .object({
    attempts: z.array(adminEmailAttemptDetailSchema).max(20),
    item: adminEmailOutboxItemSchema,
  })
  .strict();

export const adminEmailOutboxIdSchema = z.uuid({
  error: "Mensagem de e-mail inválida.",
});

export function parseAdminEmailOutboxSearchParams(
  searchParams: URLSearchParams,
) {
  return adminEmailOutboxFiltersSchema.parse(
    Object.fromEntries(searchParams.entries()),
  );
}

export function serializeAdminEmailOutboxFilters(
  input: Partial<AdminEmailOutboxFilters>,
) {
  const filters = adminEmailOutboxFiltersSchema.parse(input);
  const searchParams = new URLSearchParams();

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  if (filters.template) {
    searchParams.set("template", filters.template);
  }

  searchParams.set("order", filters.order);
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));

  return searchParams;
}

export type AdminEmailOutboxFiltersInput = Partial<AdminEmailOutboxFilters>;
