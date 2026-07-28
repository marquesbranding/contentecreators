import { z } from "zod";

import type {
  BackofficeAnalyticsFilters,
  BackofficeAnalyticsFiltersInput,
  BackofficeAnalyticsResponseDto,
} from "../types/backoffice-analytics.types";

export const backofficeAnalyticsPeriodDaysSchema = z.union([
  z.literal(7),
  z.literal(30),
  z.literal(90),
]);

export const backofficeAnalyticsFiltersSchema: z.ZodType<BackofficeAnalyticsFilters> =
  z
    .object({
      periodDays: z.preprocess(
        (value) => (value === undefined || value === "" ? 30 : Number(value)),
        backofficeAnalyticsPeriodDaysSchema,
      ),
    })
    .strict();

const nonnegativeIntegerSchema = z.number().int().nonnegative();

const statusCountsSchema = z
  .object({
    APPROVED: nonnegativeIntegerSchema,
    BANNED: nonnegativeIntegerSchema,
    CHANGES_REQUESTED: nonnegativeIntegerSchema,
    ONBOARDING: nonnegativeIntegerSchema,
    PENDING_REVIEW: nonnegativeIntegerSchema,
    SUSPENDED: nonnegativeIntegerSchema,
  })
  .strict();

const roleSummarySchema = z
  .object({
    byStatus: statusCountsSchema,
    total: nonnegativeIntegerSchema,
  })
  .strict();

export const backofficeAnalyticsResponseSchema: z.ZodType<BackofficeAnalyticsResponseDto> =
  z
    .object({
      byRole: z
        .object({
          COMPANY: roleSummarySchema,
          INFLUENCER: roleSummarySchema,
        })
        .strict(),
      completion: z
        .object({
          calculatorVersion: z.number().int().positive(),
          completedProfiles: nonnegativeIntegerSchema,
          percentage: z.number().min(0).max(100),
          totalProfiles: nonnegativeIntegerSchema,
        })
        .strict(),
      newRegistrations: z
        .object({
          byRole: z
            .object({
              COMPANY: nonnegativeIntegerSchema,
              INFLUENCER: nonnegativeIntegerSchema,
            })
            .strict(),
          total: nonnegativeIntegerSchema,
        })
        .strict(),
      period: z
        .object({
          days: backofficeAnalyticsPeriodDaysSchema,
          endsAtExclusive: z.iso.datetime({ offset: true }),
          fromDate: z.iso.date(),
          startsAt: z.iso.datetime({ offset: true }),
          throughDate: z.iso.date(),
          timeZone: z.literal("America/Sao_Paulo"),
        })
        .strict(),
      totals: z
        .object({
          awaitingApproval: nonnegativeIntegerSchema,
          companies: nonnegativeIntegerSchema,
          influencers: nonnegativeIntegerSchema,
        })
        .strict(),
    })
    .strict();

export function parseBackofficeAnalyticsSearchParams(
  searchParams: URLSearchParams,
) {
  return backofficeAnalyticsFiltersSchema.parse(
    Object.fromEntries(searchParams.entries()),
  );
}

export function serializeBackofficeAnalyticsFilters(
  input: BackofficeAnalyticsFiltersInput,
) {
  const filters = backofficeAnalyticsFiltersSchema.parse(input);
  return new URLSearchParams({
    periodDays: String(filters.periodDays),
  });
}
