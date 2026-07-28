import "server-only";

import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import {
  backofficeAnalyticsResponseSchema,
  parseBackofficeAnalyticsSearchParams,
} from "../../schemas/backoffice-analytics.schema";
import { AdminAnalyticsPeriodError } from "../analytics/admin-analytics.period";
import {
  ADMIN_ANALYTICS_TIME_ZONE,
  type AdminAnalyticsPeriodInput,
} from "../analytics/admin-analytics.types";
import { createServerAdminAnalyticsService } from "../analytics/admin-analytics.service";

interface BackofficeAnalyticsRouteDependencies {
  get(period: AdminAnalyticsPeriodInput, requestId: string): Promise<unknown>;
  now(): Date;
  requestIdFactory(): string;
}

const civilDateFormatter = new Intl.DateTimeFormat("en-CA", {
  calendar: "gregory",
  day: "2-digit",
  month: "2-digit",
  numberingSystem: "latn",
  timeZone: ADMIN_ANALYTICS_TIME_ZONE,
  year: "numeric",
});

function safeRequestId(request: NextRequest, fallback: () => string) {
  const requestId = request.headers.get("x-request-id")?.trim();

  return requestId &&
    requestId.length <= 128 &&
    /^[a-zA-Z0-9._:-]+$/u.test(requestId)
    ? requestId
    : fallback();
}

function responseHeaders(requestId: string) {
  return {
    "cache-control": "private, no-store",
    "x-request-id": requestId,
  };
}

function formatCivilDate(now: Date) {
  if (!Number.isFinite(now.getTime())) {
    throw new AdminAnalyticsPeriodError("INVALID_PERIOD");
  }

  const parts = Object.fromEntries(
    civilDateFormatter
      .formatToParts(now)
      .filter(
        ({ type }) => type === "day" || type === "month" || type === "year",
      )
      .map(({ type, value }) => [type, value]),
  );

  if (!parts.year || !parts.month || !parts.day) {
    throw new AdminAnalyticsPeriodError("INVALID_PERIOD");
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function subtractCivilDays(civilDate: string, days: number) {
  const [year, month, day] = civilDate.split("-").map(Number);

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    !Number.isInteger(days) ||
    days < 0
  ) {
    throw new AdminAnalyticsPeriodError("INVALID_PERIOD");
  }

  const result = new Date(Date.UTC(year, month - 1, day - days));

  return [
    String(result.getUTCFullYear()).padStart(4, "0"),
    String(result.getUTCMonth() + 1).padStart(2, "0"),
    String(result.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function resolveRequestPeriod(
  periodDays: 7 | 30 | 90,
  now: Date,
): AdminAnalyticsPeriodInput {
  const throughDate = formatCivilDate(now);

  return {
    fromDate: subtractCivilDays(throughDate, periodDays - 1),
    throughDate,
  };
}

export function createBackofficeAnalyticsRouteHandler(
  dependencies: BackofficeAnalyticsRouteDependencies,
) {
  return async function GET(request: NextRequest) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    let period: AdminAnalyticsPeriodInput;

    try {
      const filters = parseBackofficeAnalyticsSearchParams(
        request.nextUrl.searchParams,
      );
      period = resolveRequestPeriod(filters.periodDays, dependencies.now());
    } catch (error) {
      const fieldErrors =
        error instanceof z.ZodError
          ? z.flattenError(error).fieldErrors
          : undefined;

      return NextResponse.json(
        { fieldErrors, message: "Revise o período informado." },
        { headers: responseHeaders(requestId), status: 422 },
      );
    }

    try {
      const result = backofficeAnalyticsResponseSchema.parse(
        await dependencies.get(period, requestId),
      );

      return NextResponse.json(result, {
        headers: responseHeaders(requestId),
        status: 200,
      });
    } catch (error) {
      if (
        error instanceof VerifiedAccountTransactionError &&
        error.code === "UNAUTHENTICATED"
      ) {
        return NextResponse.json(
          { message: "Sua sessão expirou. Entre novamente." },
          { headers: responseHeaders(requestId), status: 401 },
        );
      }

      if (
        error instanceof VerifiedAccountTransactionError ||
        error instanceof AccountAccessError
      ) {
        return NextResponse.json(
          { message: "Você não tem permissão para acessar os indicadores." },
          { headers: responseHeaders(requestId), status: 403 },
        );
      }

      if (error instanceof AdminAnalyticsPeriodError) {
        return NextResponse.json(
          { message: "Revise o período informado." },
          { headers: responseHeaders(requestId), status: 422 },
        );
      }

      console.error({
        error: "backoffice_analytics_read_failed",
        requestId,
      });

      return NextResponse.json(
        { message: "Não foi possível carregar os indicadores agora." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}

export async function createServerBackofficeAnalyticsRouteHandler(
  completionVersion: number,
) {
  const service = await createServerAdminAnalyticsService(completionVersion);

  return createBackofficeAnalyticsRouteHandler({
    get: service.get,
    now: () => new Date(),
    requestIdFactory: randomUUID,
  });
}
