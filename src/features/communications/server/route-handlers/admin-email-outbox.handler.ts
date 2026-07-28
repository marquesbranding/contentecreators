import "server-only";

import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import {
  adminEmailOutboxIdSchema,
  parseAdminEmailOutboxSearchParams,
} from "../../schemas/admin-email-outbox.schema";
import type {
  AdminEmailOutboxDetailDto,
  AdminEmailOutboxFilters,
  AdminEmailOutboxListDto,
} from "../../types/admin-email-outbox.types";
import { createServerAdminEmailOutboxService } from "../services/admin-email-outbox.service";

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

function deniedResponse(error: unknown, requestId: string) {
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
      {
        message: "Você não tem permissão para acessar os e-mails operacionais.",
      },
      { headers: responseHeaders(requestId), status: 403 },
    );
  }

  return null;
}

interface ListDependencies {
  list(
    filters: AdminEmailOutboxFilters,
    requestId: string,
  ): Promise<AdminEmailOutboxListDto>;
  requestIdFactory(): string;
}

interface DetailDependencies {
  findDetail(
    outboxId: string,
    requestId: string,
  ): Promise<AdminEmailOutboxDetailDto | null>;
  requestIdFactory(): string;
}

export function createAdminEmailOutboxListRouteHandler(
  dependencies: ListDependencies,
) {
  return async function GET(request: NextRequest) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    let filters: AdminEmailOutboxFilters;

    try {
      filters = parseAdminEmailOutboxSearchParams(request.nextUrl.searchParams);
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
      const denied = deniedResponse(error, requestId);

      if (denied) {
        return denied;
      }

      console.error({ error: "admin_email_outbox_list_failed", requestId });

      return NextResponse.json(
        { message: "Não foi possível carregar os e-mails operacionais." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}

export function createAdminEmailOutboxDetailRouteHandler(
  dependencies: DetailDependencies,
) {
  return async function GET(request: NextRequest, outboxIdInput: string) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    const parsedId = adminEmailOutboxIdSchema.safeParse(outboxIdInput);

    if (!parsedId.success) {
      return NextResponse.json(
        { message: "Mensagem de e-mail inválida." },
        { headers: responseHeaders(requestId), status: 422 },
      );
    }

    try {
      const result = await dependencies.findDetail(parsedId.data, requestId);

      if (!result) {
        return NextResponse.json(
          { message: "Não foi possível localizar esta mensagem operacional." },
          { headers: responseHeaders(requestId), status: 404 },
        );
      }

      return NextResponse.json(result, {
        headers: responseHeaders(requestId),
        status: 200,
      });
    } catch (error) {
      const denied = deniedResponse(error, requestId);

      if (denied) {
        return denied;
      }

      console.error({ error: "admin_email_outbox_detail_failed", requestId });

      return NextResponse.json(
        { message: "Não foi possível carregar os detalhes desta mensagem." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}

export async function createServerAdminEmailOutboxListRouteHandler() {
  const service = await createServerAdminEmailOutboxService();

  return createAdminEmailOutboxListRouteHandler({
    list: service.list,
    requestIdFactory: randomUUID,
  });
}

export async function createServerAdminEmailOutboxDetailRouteHandler() {
  const service = await createServerAdminEmailOutboxService();

  return createAdminEmailOutboxDetailRouteHandler({
    findDetail: service.findDetail,
    requestIdFactory: randomUUID,
  });
}
