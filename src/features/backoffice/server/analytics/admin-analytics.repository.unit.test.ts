import { describe, expect, it } from "vitest";

import { PROFILE_COMPLETION_VERSION } from "@/features/onboarding";

import { resolveAdminAnalyticsPeriod } from "./admin-analytics.period";
import { composeAdminAnalyticsDto } from "./admin-analytics.repository";

const bounds = resolveAdminAnalyticsPeriod({
  fromDate: "2026-07-01",
  throughDate: "2026-07-31",
});

describe("admin analytics metric definitions", () => {
  it("counts profile roles/statuses and only PENDING_REVIEW as awaiting approval", () => {
    const result = composeAdminAnalyticsDto(
      {
        completion: {
          averagePercentage: 80,
          completedProfiles: 2,
          profileCount: 5,
          version: PROFILE_COMPLETION_VERSION,
        },
        newRegistrations: [
          { role: "INFLUENCER", total: 2 },
          { role: "COMPANY", total: 1 },
          { role: "ADMIN", total: 99 },
        ],
        roleStatuses: [
          { role: "INFLUENCER", status: "ONBOARDING", total: 1 },
          { role: "INFLUENCER", status: "PENDING_REVIEW", total: 2 },
          { role: "INFLUENCER", status: "CHANGES_REQUESTED", total: 3 },
          { role: "INFLUENCER", status: "APPROVED", total: 4 },
          { role: "INFLUENCER", status: "SUSPENDED", total: 5 },
          { role: "INFLUENCER", status: "BANNED", total: 6 },
          { role: "COMPANY", status: "PENDING_REVIEW", total: 7 },
          { role: "COMPANY", status: "APPROVED", total: 8 },
          { role: "ADMIN", status: "APPROVED", total: 99 },
        ],
      },
      bounds,
    );

    expect(result.totals).toEqual({
      awaitingApproval: 9,
      companies: 15,
      influencers: 21,
    });
    expect(result.byRole.INFLUENCER.byStatus).toEqual({
      APPROVED: 4,
      BANNED: 6,
      CHANGES_REQUESTED: 3,
      ONBOARDING: 1,
      PENDING_REVIEW: 2,
      SUSPENDED: 5,
    });
    expect(result.newRegistrations).toEqual({
      byRole: { COMPANY: 1, INFLUENCER: 2 },
      total: 3,
    });
  });

  it("preserves the explicitly supplied shared completion version in the safe DTO", () => {
    const current = composeAdminAnalyticsDto(
      {
        completion: {
          averagePercentage: 75,
          completedProfiles: 3,
          profileCount: 4,
          version: PROFILE_COMPLETION_VERSION,
        },
        newRegistrations: [],
        roleStatuses: [],
      },
      bounds,
    );

    expect(current.completion).toEqual({
      calculatorVersion: PROFILE_COMPLETION_VERSION,
      completedProfiles: 3,
      percentage: 75,
      totalProfiles: 4,
    });
  });
});
