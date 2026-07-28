import { describe, expect, it } from "vitest";

import {
  backofficeAnalyticsResponseSchema,
  parseBackofficeAnalyticsSearchParams,
  serializeBackofficeAnalyticsFilters,
} from "./backoffice-analytics.schema";

const validResponse = {
  byRole: {
    COMPANY: {
      byStatus: {
        APPROVED: 12,
        BANNED: 1,
        CHANGES_REQUESTED: 2,
        ONBOARDING: 3,
        PENDING_REVIEW: 4,
        SUSPENDED: 1,
      },
      total: 23,
    },
    INFLUENCER: {
      byStatus: {
        APPROVED: 30,
        BANNED: 1,
        CHANGES_REQUESTED: 3,
        ONBOARDING: 8,
        PENDING_REVIEW: 5,
        SUSPENDED: 2,
      },
      total: 49,
    },
  },
  completion: {
    calculatorVersion: 1,
    completedProfiles: 18,
    percentage: 76,
    totalProfiles: 72,
  },
  newRegistrations: {
    byRole: {
      COMPANY: 3,
      INFLUENCER: 7,
    },
    total: 10,
  },
  period: {
    days: 30,
    endsAtExclusive: "2026-07-29T03:00:00.000Z",
    fromDate: "2026-06-29",
    startsAt: "2026-06-29T03:00:00.000Z",
    throughDate: "2026-07-28",
    timeZone: "America/Sao_Paulo",
  },
  totals: {
    awaitingApproval: 9,
    companies: 23,
    influencers: 49,
  },
} as const;

describe("backoffice analytics schema", () => {
  it("normalizes the URL-owned period to the supported default", () => {
    expect(parseBackofficeAnalyticsSearchParams(new URLSearchParams())).toEqual(
      {
        periodDays: 30,
      },
    );
    expect(
      parseBackofficeAnalyticsSearchParams(
        new URLSearchParams("periodDays=90"),
      ),
    ).toEqual({ periodDays: 90 });
    expect(
      serializeBackofficeAnalyticsFilters({ periodDays: 7 }).toString(),
    ).toBe("periodDays=7");
  });

  it("rejects unsupported periods and private response fields", () => {
    expect(() =>
      parseBackofficeAnalyticsSearchParams(
        new URLSearchParams("periodDays=15"),
      ),
    ).toThrow();
    expect(() =>
      backofficeAnalyticsResponseSchema.parse({
        ...validResponse,
        operationalEmails: ["private@example.test"],
      }),
    ).toThrow();
  });

  it("accepts only bounded aggregate metrics", () => {
    expect(backofficeAnalyticsResponseSchema.parse(validResponse)).toEqual(
      validResponse,
    );
    expect(() =>
      backofficeAnalyticsResponseSchema.parse({
        ...validResponse,
        completion: {
          ...validResponse.completion,
          percentage: 101,
        },
      }),
    ).toThrow();
  });
});
