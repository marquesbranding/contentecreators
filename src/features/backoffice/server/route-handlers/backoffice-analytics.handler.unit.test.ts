import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { BackofficeAnalyticsResponseDto } from "../../types/backoffice-analytics.types";
import { AdminAnalyticsPeriodError } from "../analytics/admin-analytics.period";
import { createBackofficeAnalyticsRouteHandler } from "./backoffice-analytics.handler";

const analyticsResponse: BackofficeAnalyticsResponseDto = {
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
        BANNED: 1,
        CHANGES_REQUESTED: 2,
        ONBOARDING: 3,
        PENDING_REVIEW: 4,
        SUSPENDED: 1,
      },
      total: 23,
    },
  },
  completion: {
    calculatorVersion: 1,
    completedProfiles: 24,
    percentage: 72.73,
    totalProfiles: 33,
  },
  newRegistrations: {
    byRole: { COMPANY: 2, INFLUENCER: 5 },
    total: 7,
  },
  period: {
    days: 7,
    endsAtExclusive: "2026-03-01T03:00:00.000Z",
    fromDate: "2026-02-22",
    startsAt: "2026-02-22T03:00:00.000Z",
    throughDate: "2026-02-28",
    timeZone: "America/Sao_Paulo",
  },
  totals: {
    awaitingApproval: 7,
    companies: 10,
    influencers: 23,
  },
};

function createHandler(
  overrides: Partial<
    Parameters<typeof createBackofficeAnalyticsRouteHandler>[0]
  > = {},
) {
  return createBackofficeAnalyticsRouteHandler({
    get: vi.fn(async () => analyticsResponse),
    now: () => new Date("2026-03-01T02:30:00.000Z"),
    requestIdFactory: () => "generated-request-id",
    ...overrides,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("backoffice analytics Route Handler", () => {
  it("uses inclusive civil dates in America/Sao_Paulo and preserves a safe request ID", async () => {
    const get = vi.fn(async () => analyticsResponse);
    const handler = createHandler({ get });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/analytics?periodDays=7",
        { headers: { "x-request-id": "incoming-request-id" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBe("incoming-request-id");
    expect(get).toHaveBeenCalledWith(
      {
        fromDate: "2026-02-22",
        throughDate: "2026-02-28",
      },
      "incoming-request-id",
    );
    expect(await response.json()).toEqual(analyticsResponse);
  });

  it.each([
    [7, "2026-07-22"],
    [30, "2026-06-29"],
    [90, "2026-04-30"],
  ] as const)(
    "derives the inclusive %i-day period across civil calendar boundaries",
    async (periodDays, expectedFromDate) => {
      const get = vi.fn(async () => analyticsResponse);
      const handler = createHandler({
        get,
        now: () => new Date("2026-07-28T15:00:00.000Z"),
      });

      await handler(
        new NextRequest(
          `http://localhost:3000/api/backoffice/analytics?periodDays=${periodDays}`,
        ),
      );

      expect(get).toHaveBeenCalledWith(
        {
          fromDate: expectedFromDate,
          throughDate: "2026-07-28",
        },
        "generated-request-id",
      );
    },
  );

  it("uses the browser schema default of 30 days", async () => {
    const get = vi.fn(async () => analyticsResponse);
    const handler = createHandler({
      get,
      now: () => new Date("2026-07-28T15:00:00.000Z"),
    });

    await handler(
      new NextRequest("http://localhost:3000/api/backoffice/analytics"),
    );

    expect(get).toHaveBeenCalledWith(
      {
        fromDate: "2026-06-29",
        throughDate: "2026-07-28",
      },
      "generated-request-id",
    );
  });

  it("rejects invalid or unknown URL filters without querying", async () => {
    const get = vi.fn(async () => analyticsResponse);
    const handler = createHandler({ get });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/analytics?periodDays=15&email=private%40example.com",
      ),
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(get).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain(
      "private@example.com",
    );
  });

  it("returns 422 when the injected clock cannot produce a valid period", async () => {
    const get = vi.fn(async () => analyticsResponse);
    const handler = createHandler({
      get,
      now: () => new Date(Number.NaN),
    });
    const response = await handler(
      new NextRequest("http://localhost:3000/api/backoffice/analytics"),
    );

    expect(response.status).toBe(422);
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    [
      new VerifiedAccountTransactionError("UNAUTHENTICATED"),
      401,
      "Sua sessão expirou. Entre novamente.",
    ],
    [
      new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"),
      403,
      "Você não tem permissão para acessar os indicadores.",
    ],
    [
      new AccountAccessError("ROLE_FORBIDDEN"),
      403,
      "Você não tem permissão para acessar os indicadores.",
    ],
  ] as const)(
    "does not expose analytics data for denied direct reads",
    async (error, status, message) => {
      const handler = createHandler({
        get: vi.fn().mockRejectedValue(error),
      });
      const response = await handler(
        new NextRequest("http://localhost:3000/api/backoffice/analytics"),
      );

      expect(response.status).toBe(status);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.json()).toEqual({ message });
    },
  );

  it("maps service period validation to a safe 422 response", async () => {
    const handler = createHandler({
      get: vi
        .fn()
        .mockRejectedValue(new AdminAnalyticsPeriodError("INVALID_PERIOD")),
    });
    const response = await handler(
      new NextRequest("http://localhost:3000/api/backoffice/analytics"),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      message: "Revise o período informado.",
    });
  });

  it("returns and logs a correlated safe 500 without personal data", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const handler = createHandler({
      get: vi
        .fn()
        .mockRejectedValue(
          new Error("private@example.com token=secret signed-url"),
        ),
      requestIdFactory: () => "safe-generated-request-id",
    });
    const response = await handler(
      new NextRequest("http://localhost:3000/api/backoffice/analytics", {
        headers: { "x-request-id": "private@example.com" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe(
      "safe-generated-request-id",
    );
    expect(body).toEqual({
      message: "Não foi possível carregar os indicadores agora.",
    });
    expect(JSON.stringify(body)).not.toContain("private@example.com");
    expect(consoleError).toHaveBeenCalledWith({
      error: "backoffice_analytics_read_failed",
      requestId: "safe-generated-request-id",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "private@example.com",
    );
  });

  it("returns a safe 500 when the service response violates the browser contract", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const handler = createHandler({
      get: vi.fn().mockResolvedValue({
        ...analyticsResponse,
        period: { ...analyticsResponse.period, days: 14 },
      }),
    });
    const response = await handler(
      new NextRequest("http://localhost:3000/api/backoffice/analytics"),
    );

    expect(response.status).toBe(500);
    expect(consoleError).toHaveBeenCalledWith({
      error: "backoffice_analytics_read_failed",
      requestId: "generated-request-id",
    });
  });
});
