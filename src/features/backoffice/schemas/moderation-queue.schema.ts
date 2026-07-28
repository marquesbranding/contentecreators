import { z } from "zod";

import type { ModerationQueueFilters } from "../types/moderation-queue.types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const moderationQueueRoleSchema = z.enum(["INFLUENCER", "COMPANY"]);
export const moderationQueueStatusSchema = z.enum([
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SUSPENDED",
  "BANNED",
]);
export const moderationQueueOrderSchema = z.enum([
  "PENDING_FIRST",
  "OLDEST_SUBMITTED",
  "NEWEST_SUBMITTED",
  "NAME_ASC",
]);

const positiveIntegerFromUrl = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : Number(value)),
    z.number().int().positive(),
  );

const moderationQueueFiltersInputSchema = z.object({
  order: moderationQueueOrderSchema.default("PENDING_FIRST"),
  page: positiveIntegerFromUrl(1),
  pageSize: positiveIntegerFromUrl(DEFAULT_PAGE_SIZE).transform((value) =>
    Math.min(value, MAX_PAGE_SIZE),
  ),
  role: moderationQueueRoleSchema.default("INFLUENCER"),
  search: z.string().trim().max(120).default(""),
  status: moderationQueueStatusSchema.optional(),
});

export const moderationQueueFiltersSchema =
  moderationQueueFiltersInputSchema.transform((filters) => ({
    order: filters.order,
    page: filters.page,
    pageSize: filters.pageSize,
    role: filters.role,
    search: filters.search,
    status: filters.status,
  }));

const moderationQueueItemSchema = z
  .object({
    accountId: z.uuid(),
    accountVersion: z.number().int().positive(),
    completionPercentage: z.number().int().min(0).max(100),
    completionVersion: z.number().int().positive(),
    displayName: z.string().trim().min(1).max(200),
    profileVersion: z.number().int().positive(),
    role: moderationQueueRoleSchema,
    status: moderationQueueStatusSchema,
    submittedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const statusCountsSchema = z
  .object({
    APPROVED: z.number().int().nonnegative(),
    BANNED: z.number().int().nonnegative(),
    CHANGES_REQUESTED: z.number().int().nonnegative(),
    PENDING_REVIEW: z.number().int().nonnegative(),
    SUSPENDED: z.number().int().nonnegative(),
  })
  .strict();

export const moderationQueueResponseSchema = z
  .object({
    counts: z
      .object({
        byRole: z
          .object({
            COMPANY: z.number().int().nonnegative(),
            INFLUENCER: z.number().int().nonnegative(),
          })
          .strict(),
        byStatus: statusCountsSchema,
      })
      .strict(),
    items: z.array(moderationQueueItemSchema),
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

export function parseModerationQueueSearchParams(
  searchParams: URLSearchParams,
) {
  return moderationQueueFiltersSchema.parse(
    Object.fromEntries(searchParams.entries()),
  );
}

export function serializeModerationQueueFilters(
  input: z.input<typeof moderationQueueFiltersInputSchema>,
) {
  const filters = moderationQueueFiltersSchema.parse(input);
  const searchParams = new URLSearchParams();

  searchParams.set("role", filters.role);

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  searchParams.set("order", filters.order);
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));

  return searchParams;
}

export type ModerationQueueFiltersInput = Partial<ModerationQueueFilters>;
