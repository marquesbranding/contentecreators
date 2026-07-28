import { describe, expect, it } from "vitest";

import {
  AdminAnalyticsPeriodError,
  resolveAdminAnalyticsPeriod,
} from "./admin-analytics.period";

describe("admin analytics reporting period", () => {
  it("derives half-open UTC bounds from inclusive São Paulo civil dates", () => {
    expect(
      resolveAdminAnalyticsPeriod({
        fromDate: "2026-07-01",
        throughDate: "2026-07-31",
      }),
    ).toEqual({
      endUtcExclusive: new Date("2026-08-01T03:00:00.000Z"),
      period: {
        days: 31,
        endsAtExclusive: "2026-08-01T03:00:00.000Z",
        fromDate: "2026-07-01",
        startsAt: "2026-07-01T03:00:00.000Z",
        throughDate: "2026-07-31",
        timeZone: "America/Sao_Paulo",
      },
      startUtc: new Date("2026-07-01T03:00:00.000Z"),
    });
  });

  it("uses the earliest instant of a civil date when DST skips local midnight", () => {
    const bounds = resolveAdminAnalyticsPeriod({
      fromDate: "2018-11-04",
      throughDate: "2018-11-04",
    });

    expect(bounds.startUtc.toISOString()).toBe("2018-11-04T03:00:00.000Z");
    expect(bounds.endUtcExclusive.toISOString()).toBe(
      "2018-11-05T02:00:00.000Z",
    );
    expect(bounds.endUtcExclusive.getTime() - bounds.startUtc.getTime()).toBe(
      23 * 60 * 60 * 1000,
    );
  });

  it("preserves the repeated hour when DST ends", () => {
    const bounds = resolveAdminAnalyticsPeriod({
      fromDate: "2019-02-16",
      throughDate: "2019-02-16",
    });

    expect(bounds.startUtc.toISOString()).toBe("2019-02-16T02:00:00.000Z");
    expect(bounds.endUtcExclusive.toISOString()).toBe(
      "2019-02-17T03:00:00.000Z",
    );
    expect(bounds.endUtcExclusive.getTime() - bounds.startUtc.getTime()).toBe(
      25 * 60 * 60 * 1000,
    );
  });

  it.each([
    { fromDate: "2026-02-30", throughDate: "2026-03-01" },
    { fromDate: "2026/01/01", throughDate: "2026-01-31" },
    { fromDate: "2026-02-01", throughDate: "2026-01-31" },
  ])("rejects an invalid or inverted period: %o", (period) => {
    expect(() => resolveAdminAnalyticsPeriod(period)).toThrow(
      new AdminAnalyticsPeriodError("INVALID_PERIOD"),
    );
  });

  it("bounds reporting periods to 366 civil days", () => {
    expect(() =>
      resolveAdminAnalyticsPeriod({
        fromDate: "2025-01-01",
        throughDate: "2026-01-02",
      }),
    ).toThrow(new AdminAnalyticsPeriodError("PERIOD_TOO_LARGE"));
  });
});
