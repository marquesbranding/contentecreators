import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { AdminAnalyticsDto } from "./admin-analytics.types";
import { createAdminAnalyticsService } from "./admin-analytics.service";

const period = {
  fromDate: "2026-07-01",
  throughDate: "2026-07-31",
};
const response: AdminAnalyticsDto = {
  byRole: {
    COMPANY: {
      byStatus: {
        APPROVED: 1,
        BANNED: 0,
        CHANGES_REQUESTED: 0,
        ONBOARDING: 0,
        PENDING_REVIEW: 0,
        SUSPENDED: 0,
      },
      total: 1,
    },
    INFLUENCER: {
      byStatus: {
        APPROVED: 1,
        BANNED: 0,
        CHANGES_REQUESTED: 0,
        ONBOARDING: 0,
        PENDING_REVIEW: 1,
        SUSPENDED: 0,
      },
      total: 2,
    },
  },
  completion: {
    calculatorVersion: 1,
    completedProfiles: 1,
    percentage: 75,
    totalProfiles: 2,
  },
  newRegistrations: {
    byRole: { COMPANY: 1, INFLUENCER: 1 },
    total: 2,
  },
  period: {
    ...period,
    days: 31,
    endsAtExclusive: "2026-08-01T03:00:00.000Z",
    startsAt: "2026-07-01T03:00:00.000Z",
    timeZone: "America/Sao_Paulo",
  },
  totals: {
    awaitingApproval: 1,
    companies: 1,
    influencers: 2,
  },
};

function createRunner(role: "ADMIN" | "COMPANY") {
  return vi.fn(async (_input, work) =>
    work({} as never, {
      accountId: "a0000000-0000-4000-8000-000000000001",
      authUserId: "10000000-0000-4000-8000-000000000001",
      role,
      status: "APPROVED",
    }),
  ) as unknown as VerifiedAccountTransactionRunner;
}

describe("admin analytics service", () => {
  it("reauthorizes an ADMIN and forwards explicit UTC bounds to the repository", async () => {
    const load = vi.fn(async () => response);
    const runVerifiedAccountTransaction = createRunner("ADMIN");
    const service = createAdminAnalyticsService({
      completionVersion: 1,
      load,
      runVerifiedAccountTransaction,
    });

    await expect(service.get(period, "analytics-request")).resolves.toEqual(
      response,
    );
    expect(runVerifiedAccountTransaction).toHaveBeenCalledWith(
      { requestId: "analytics-request" },
      expect.any(Function),
    );
    expect(load).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        endUtcExclusive: new Date("2026-08-01T03:00:00.000Z"),
        startUtc: new Date("2026-07-01T03:00:00.000Z"),
      }),
      1,
    );
  });

  it("denies a normal user before loading any aggregate", async () => {
    const load = vi.fn(async () => response);
    const service = createAdminAnalyticsService({
      completionVersion: 1,
      load,
      runVerifiedAccountTransaction: createRunner("COMPANY"),
    });

    await expect(service.get(period, "denied-request")).rejects.toEqual(
      new AccountAccessError("ROLE_FORBIDDEN"),
    );
    expect(load).not.toHaveBeenCalled();
  });

  it("reauthorizes before validating a denied user's reporting input", async () => {
    const load = vi.fn(async () => response);
    const service = createAdminAnalyticsService({
      completionVersion: 1,
      load,
      runVerifiedAccountTransaction: createRunner("COMPANY"),
    });

    await expect(
      service.get(
        { fromDate: "not-a-date", throughDate: "also-invalid" },
        "denied-invalid-request",
      ),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    expect(load).not.toHaveBeenCalled();
  });
});
