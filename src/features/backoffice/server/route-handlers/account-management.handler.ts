import "server-only";

import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import { parseAccountManagementSearchParams } from "../../schemas/account-management.schema";
import type {
  AccountManagementFilters,
  AccountManagementResponseDto,
} from "../../types/account-management.types";
import { createServerAccountManagementService } from "../services/account-management.service";

interface AccountManagementRouteDependencies {
  list(
    filters: AccountManagementFilters,
    requestId: string,
  ): Promise<AccountManagementResponseDto>;
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

export function createAccountManagementRouteHandler(
  dependencies: AccountManagementRouteDependencies,
) {
  return async function GET(request: NextRequest) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    let filters: AccountManagementFilters;

    try {
      filters = parseAccountManagementSearchParams(
        request.nextUrl.searchParams,
      );
    } catch (error) {
      const fieldErrors =
        error instanceof z.ZodError
          ? z.flattenError(error).fieldErrors
          : undefined;

      return NextResponse.json(
        { fieldErrors, message: "Revise os filtros informados." },
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
          { message: "Você não tem permissão para gerenciar contas." },
          { headers: responseHeaders(requestId), status: 403 },
        );
      }

      console.error({
        error: "account_management_read_failed",
        requestId,
      });

      return NextResponse.json(
        { message: "Não foi possível carregar as contas agora." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}

export async function createServerAccountManagementRouteHandler() {
  const service = await createServerAccountManagementService();

  return createAccountManagementRouteHandler({
    list: service.list,
    requestIdFactory: randomUUID,
  });
}
