import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";

import type { BackofficeAnalyticsResponseDto } from "../types/backoffice-analytics.types";
import {
  backofficeAnalyticsKeys,
  fetchBackofficeAnalytics,
} from "./backoffice-analytics.api";

const response: BackofficeAnalyticsResponseDto = {
  byRole: {
    COMPANY: {
      byStatus: {
        APPROVED: 4,
        BANNED: 0,
        CHANGES_REQUESTED: 1,
        ONBOARDING: 2,
        PENDING_REVIEW: 3,
        SUSPENDED: 0,
      },
      total: 10,
    },
    INFLUENCER: {
      byStatus: {
        APPROVED: 12,
        BANNED: 0,
        CHANGES_REQUESTED: 2,
        ONBOARDING: 4,
        PENDING_REVIEW: 5,
        SUSPENDED: 1,
      },
      total: 24,
    },
  },
  completion: {
    calculatorVersion: 1,
    completedProfiles: 10,
    percentage: 72,
    totalProfiles: 34,
  },
  newRegistrations: {
    byRole: { COMPANY: 2, INFLUENCER: 6 },
    total: 8,
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
    awaitingApproval: 8,
    companies: 10,
    influencers: 24,
  },
};

describe("backoffice analytics browser API", () => {
  it("uses one stable normalized query key per supported period", () => {
    expect(backofficeAnalyticsKeys.summary({})).toEqual(
      backofficeAnalyticsKeys.summary({ periodDays: 30 }),
    );
    expect(backofficeAnalyticsKeys.summary({ periodDays: 7 })).not.toEqual(
      backofficeAnalyticsKeys.summary({ periodDays: 90 }),
    );
  });

  it("forwards cancellation and the canonical period to same-origin Axios", async () => {
    const signal = new AbortController().signal;
    const get = vi.fn().mockResolvedValue({ data: response });
    const client = { get } as unknown as AxiosInstance;

    await expect(
      fetchBackofficeAnalytics({ periodDays: 90 }, signal, client),
    ).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith("/backoffice/analytics?periodDays=90", {
      signal,
    });
  });

  it("rejects an unsafe response instead of returning undeclared data", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        data: { ...response, rawAccounts: [{ email: "private@example.test" }] },
      }),
    } as unknown as AxiosInstance;

    await expect(
      fetchBackofficeAnalytics(
        { periodDays: 30 },
        new AbortController().signal,
        client,
      ),
    ).rejects.toThrow();
  });
});
