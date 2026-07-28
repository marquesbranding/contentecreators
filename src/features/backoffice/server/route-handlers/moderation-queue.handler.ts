import "server-only";

import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import { parseModerationQueueSearchParams } from "../../schemas/moderation-queue.schema";
import type {
  ModerationQueueFilters,
  ModerationQueueResponseDto,
} from "../../types/moderation-queue.types";
import { createServerModerationQueueService } from "../services/moderation-queue.service";

interface ModerationQueueRouteDependencies {
  list(
    filters: ModerationQueueFilters,
    requestId: string,
  ): Promise<ModerationQueueResponseDto>;
  requestIdFactory(): string;
}

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

export function createModerationQueueRouteHandler(
  dependencies: ModerationQueueRouteDependencies,
) {
  return async function GET(request: NextRequest) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    let filters: ModerationQueueFilters;

    try {
      filters = parseModerationQueueSearchParams(request.nextUrl.searchParams);
    } catch (error) {
      const fieldErrors =
        error instanceof z.ZodError
          ? z.flattenError(error).fieldErrors
          : undefined;

      return NextResponse.json(
        {
          fieldErrors,
          message: "Revise os filtros informados.",
        },
        { headers: responseHeaders(requestId), status: 422 },
      );
    }

    try {
      const result = await dependencies.list(filters, requestId);

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
          { message: "Você não tem permissão para acessar esta fila." },
          { headers: responseHeaders(requestId), status: 403 },
        );
      }

      console.error({
        error: "moderation_queue_read_failed",
        requestId,
      });

      return NextResponse.json(
        { message: "Não foi possível carregar a fila agora." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}

export async function createServerModerationQueueRouteHandler() {
  const service = await createServerModerationQueueService();

  return createModerationQueueRouteHandler({
    list: service.list,
    requestIdFactory: randomUUID,
  });
}
