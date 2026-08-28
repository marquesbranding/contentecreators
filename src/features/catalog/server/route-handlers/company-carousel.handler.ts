import "server-only";

import { type NextRequest, NextResponse } from "next/server";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { CompanyCarouselRequest } from "../../types/company-carousel.types";
import type { CompanyCarouselViewResponseDto } from "../../types/company-carousel-view.types";
import { catalogNoStoreHeaders } from "../policies/catalog-freshness.policy";

interface CompanyCarouselRouteDependencies {
  list(
    input: CompanyCarouselRequest,
    requestId: string,
  ): Promise<CompanyCarouselViewResponseDto>;
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
    ...catalogNoStoreHeaders,
    "x-request-id": requestId,
  };
}

export function createCompanyCarouselRouteHandler(
  dependencies: CompanyCarouselRouteDependencies,
) {
  return async function GET(request: NextRequest) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    const rawLimit = request.nextUrl.searchParams.get("limit");
    const numericLimit = rawLimit === null ? undefined : Number(rawLimit);
    const input: CompanyCarouselRequest = {
      limit:
        numericLimit !== undefined && Number.isFinite(numericLimit)
          ? numericLimit
          : undefined,
      search: request.nextUrl.searchParams.get("search") ?? undefined,
      segment: request.nextUrl.searchParams.get("segment") ?? undefined,
    };

    try {
      const response = await dependencies.list(input, requestId);

      return NextResponse.json(response, {
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
          { message: "Conteúdo indisponível." },
          { headers: responseHeaders(requestId), status: 403 },
        );
      }

      console.error({
        error: "company_carousel_read_failed",
        requestId,
      });

      return NextResponse.json(
        { message: "Não foi possível carregar as empresas agora." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}
