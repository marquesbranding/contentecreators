import "server-only";

import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import { parseAuditHistorySearchParams } from "../../schemas/audit-history.schema";
import type {
  AuditHistoryFilters,
  AuditHistoryResponseDto,
} from "../../types/audit-history.types";
import { createServerAuditHistoryService } from "../services/audit-history.service";

interface AuditHistoryRouteDependencies {
  list(
    filters: AuditHistoryFilters,
    requestId: string,
  ): Promise<AuditHistoryResponseDto>;
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

export function createAuditHistoryRouteHandler(
  dependencies: AuditHistoryRouteDependencies,
) {
  return async function GET(request: NextRequest) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    let filters: AuditHistoryFilters;

    try {
      filters = parseAuditHistorySearchParams(request.nextUrl.searchParams);
    } catch (error) {
      const fieldErrors =
        error instanceof z.ZodError
          ? z.flattenError(error).fieldErrors
          : undefined;

      return NextResponse.json(
        {
          fieldErrors,
          message: "Revise os filtros da auditoria.",
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
          { message: "Você não tem permissão para consultar a auditoria." },
          { headers: responseHeaders(requestId), status: 403 },
        );
      }

      console.error({
        error: "audit_history_read_failed",
        requestId,
      });

      return NextResponse.json(
        { message: "Não foi possível carregar a auditoria agora." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}

export async function createServerAuditHistoryRouteHandler() {
  const service = await createServerAuditHistoryService();

  return createAuditHistoryRouteHandler({
    list: service.list,
    requestIdFactory: randomUUID,
  });
}
