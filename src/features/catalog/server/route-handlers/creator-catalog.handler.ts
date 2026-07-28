import "server-only";

import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { CreatorCatalogBrowserPageDto } from "../../api/creator-catalog.contract";
import { creatorCatalogBrowserPageSchema } from "../../api/creator-catalog.contract";
import {
  parseCreatorCatalogSearchParams,
  type CreatorCatalogFiltersInput,
} from "../../schemas/creator-catalog.schema";
import { catalogNoStoreHeaders } from "../policies/catalog-freshness.policy";
import { CreatorCatalogCursorError } from "../repositories/creator-catalog-cursor";

interface CreatorCatalogRouteDependencies {
  loadPage(
    filters: CreatorCatalogFiltersInput,
    requestId: string,
  ): Promise<CreatorCatalogBrowserPageDto>;
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

export function createCreatorCatalogRouteHandler(
  dependencies: CreatorCatalogRouteDependencies,
) {
  return async function GET(request: NextRequest) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    let filters: CreatorCatalogFiltersInput;

    try {
      filters = parseCreatorCatalogSearchParams(request.nextUrl.searchParams);
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
      const result = creatorCatalogBrowserPageSchema.parse(
        await dependencies.loadPage(filters, requestId),
      );

      return NextResponse.json(result, {
        headers: responseHeaders(requestId),
        status: 200,
      });
    } catch (error) {
      if (error instanceof CreatorCatalogCursorError) {
        return NextResponse.json(
          { message: "Revise os filtros informados." },
          { headers: responseHeaders(requestId), status: 422 },
        );
      }

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
          { message: "Seu acesso ao catálogo não está disponível." },
          { headers: responseHeaders(requestId), status: 403 },
        );
      }

      console.error({
        error: "creator_catalog_read_failed",
        requestId,
      });

      return NextResponse.json(
        { message: "Não foi possível carregar os criadores agora." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}

export function createCreatorCatalogRouteHandlerWithLoader(
  loadPage: CreatorCatalogRouteDependencies["loadPage"],
) {
  return createCreatorCatalogRouteHandler({
    loadPage,
    requestIdFactory: randomUUID,
  });
}
