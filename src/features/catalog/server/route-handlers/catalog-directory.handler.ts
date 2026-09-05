import "server-only";

import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { DirectoryBrowserPageDto } from "../../api/catalog-directory.contract";
import { directoryBrowserPageSchema } from "../../api/catalog-directory.contract";
import {
  parseDirectorySearchParams,
  type DirectoryFiltersInput,
} from "../../schemas/catalog-directory.schema";
import { catalogNoStoreHeaders } from "../policies/catalog-freshness.policy";
import { DirectoryCursorError } from "../repositories/catalog-directory-cursor";

interface CatalogDirectoryRouteDependencies {
  loadPage(
    filters: DirectoryFiltersInput,
    requestId: string,
  ): Promise<DirectoryBrowserPageDto>;
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

export function createCatalogDirectoryRouteHandler(
  dependencies: CatalogDirectoryRouteDependencies,
) {
  return async function GET(request: NextRequest) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    let filters: DirectoryFiltersInput;

    try {
      filters = parseDirectorySearchParams(request.nextUrl.searchParams);
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
      const result = directoryBrowserPageSchema.parse(
        await dependencies.loadPage(filters, requestId),
      );

      return NextResponse.json(result, {
        headers: responseHeaders(requestId),
        status: 200,
      });
    } catch (error) {
      if (error instanceof DirectoryCursorError) {
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
        error: "catalog_directory_read_failed",
        requestId,
      });

      return NextResponse.json(
        { message: "Não foi possível carregar o catálogo agora." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}

export function createCatalogDirectoryRouteHandlerWithLoader(
  loadPage: CatalogDirectoryRouteDependencies["loadPage"],
) {
  return createCatalogDirectoryRouteHandler({
    loadPage,
    requestIdFactory: randomUUID,
  });
}
