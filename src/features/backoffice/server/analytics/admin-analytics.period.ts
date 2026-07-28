import {
  ADMIN_ANALYTICS_TIME_ZONE,
  type AdminAnalyticsPeriodInput,
  type AdminAnalyticsQueryBounds,
} from "./admin-analytics.types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const maxPeriodDays = 366;
const searchPaddingMilliseconds = 48 * 60 * 60 * 1000;
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  calendar: "gregory",
  day: "2-digit",
  month: "2-digit",
  numberingSystem: "latn",
  timeZone: ADMIN_ANALYTICS_TIME_ZONE,
  year: "numeric",
});

export type AdminAnalyticsPeriodErrorCode =
  "INVALID_PERIOD" | "PERIOD_TOO_LARGE";

export class AdminAnalyticsPeriodError extends Error {
  constructor(readonly code: AdminAnalyticsPeriodErrorCode) {
    super(code);
    this.name = "AdminAnalyticsPeriodError";
  }
}

interface CivilDate {
  day: number;
  key: string;
  month: number;
  utcEpoch: number;
  year: number;
}

function parseCivilDate(value: string): CivilDate | null {
  if (!datePattern.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (year === undefined || month === undefined || day === undefined) {
    return null;
  }

  const utcEpoch = Date.UTC(year, month - 1, day);
  const normalized = new Date(utcEpoch);

  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    return null;
  }

  return { day, key: value, month, utcEpoch, year };
}

function formatCivilDateAt(utcEpoch: number) {
  const values = Object.fromEntries(
    dateFormatter
      .formatToParts(new Date(utcEpoch))
      .filter(
        ({ type }) => type === "day" || type === "month" || type === "year",
      )
      .map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function startOfCivilDateUtc(date: CivilDate) {
  let lower = date.utcEpoch - searchPaddingMilliseconds;
  let upper = date.utcEpoch + searchPaddingMilliseconds;

  while (lower < upper) {
    const midpoint = lower + Math.floor((upper - lower) / 2);

    if (formatCivilDateAt(midpoint) < date.key) {
      lower = midpoint + 1;
    } else {
      upper = midpoint;
    }
  }

  if (formatCivilDateAt(lower) !== date.key) {
    throw new AdminAnalyticsPeriodError("INVALID_PERIOD");
  }

  return new Date(lower);
}

function nextCivilDate(date: CivilDate) {
  const next = new Date(date.utcEpoch + millisecondsPerDay);
  const year = next.getUTCFullYear();
  const month = next.getUTCMonth() + 1;
  const day = next.getUTCDate();
  const key = [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");

  return { day, key, month, utcEpoch: next.getTime(), year };
}

export function resolveAdminAnalyticsPeriod(
  input: AdminAnalyticsPeriodInput,
): AdminAnalyticsQueryBounds {
  const from = parseCivilDate(input.fromDate);
  const through = parseCivilDate(input.throughDate);

  if (!from || !through || through.utcEpoch < from.utcEpoch) {
    throw new AdminAnalyticsPeriodError("INVALID_PERIOD");
  }

  const days =
    Math.floor((through.utcEpoch - from.utcEpoch) / millisecondsPerDay) + 1;

  if (days > maxPeriodDays) {
    throw new AdminAnalyticsPeriodError("PERIOD_TOO_LARGE");
  }

  const startUtc = startOfCivilDateUtc(from);
  const endUtcExclusive = startOfCivilDateUtc(nextCivilDate(through));

  return {
    endUtcExclusive,
    period: {
      days,
      endsAtExclusive: endUtcExclusive.toISOString(),
      fromDate: from.key,
      startsAt: startUtc.toISOString(),
      throughDate: through.key,
      timeZone: ADMIN_ANALYTICS_TIME_ZONE,
    },
    startUtc,
  };
}
