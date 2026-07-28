import { z } from "zod";

import type { AccountManagementFilters } from "../types/account-management.types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const managedAccountRoleSchema = z.enum([
  "ADMIN",
  "INFLUENCER",
  "COMPANY",
]);
export const managedAccountStatusSchema = z.enum([
  "ONBOARDING",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SUSPENDED",
  "BANNED",
]);
export const managedAccountArchiveSchema = z.enum([
  "ACTIVE",
  "ARCHIVED",
  "ALL",
]);
export const managedAccountOrderSchema = z.enum([
  "NEWEST",
  "OLDEST",
  "NAME_ASC",
  "COMPLETION_DESC",
]);

const positiveIntegerFromUrl = (fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : Number(value)),
    z.number().int().positive(),
  );

const accountManagementFiltersInputSchema = z.object({
  archive: managedAccountArchiveSchema.default("ACTIVE"),
  order: managedAccountOrderSchema.default("NEWEST"),
  page: positiveIntegerFromUrl(1),
  pageSize: positiveIntegerFromUrl(DEFAULT_PAGE_SIZE).transform((value) =>
    Math.min(value, MAX_PAGE_SIZE),
  ),
  role: managedAccountRoleSchema.optional(),
  search: z.string().trim().max(120).default(""),
  status: managedAccountStatusSchema.optional(),
});

export const accountManagementFiltersSchema =
  accountManagementFiltersInputSchema.transform((filters) => ({
    archive: filters.archive,
    order: filters.order,
    page: filters.page,
    pageSize: filters.pageSize,
    role: filters.role,
    search: filters.search,
    status: filters.status,
  }));

const managedAccountSummarySchema = z
  .object({
    accountId: z.uuid(),
    archivedAt: z.iso.datetime({ offset: true }).nullable(),
    completionPercentage: z.number().int().min(0).max(100),
    createdAt: z.iso.datetime({ offset: true }),
    displayName: z.string().trim().min(1).max(320),
    operationalEmail: z.email().max(320),
    role: managedAccountRoleSchema.nullable(),
    status: managedAccountStatusSchema,
    updatedAt: z.iso.datetime({ offset: true }),
    version: z.number().int().positive(),
  })
  .strict();

export const accountManagementResponseSchema = z
  .object({
    items: z.array(managedAccountSummarySchema),
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

export function parseAccountManagementSearchParams(
  searchParams: URLSearchParams,
) {
  return accountManagementFiltersSchema.parse(
    Object.fromEntries(searchParams.entries()),
  );
}

export function serializeAccountManagementFilters(
  input: Partial<AccountManagementFilters>,
) {
  const filters = accountManagementFiltersSchema.parse(input);
  const searchParams = new URLSearchParams();

  if (filters.role) {
    searchParams.set("role", filters.role);
  }

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  searchParams.set("archive", filters.archive);

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  searchParams.set("order", filters.order);
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));

  return searchParams;
}

export type AccountManagementFiltersInput = Partial<AccountManagementFilters>;
