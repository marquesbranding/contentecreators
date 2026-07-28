import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import { catalogDetailQuerySchema } from "../../schemas/catalog-detail.schema";
import type { CatalogCreatorDetailViewDto } from "../../types/catalog-detail-view.types";
import { catalogNoStoreHeaders } from "../policies/catalog-freshness.policy";

interface CatalogDetailRouteDependencies {
  consumeContactCapacity?(): Promise<{
    allowed: boolean;
    retryAfterSeconds: number;
  }>;
  load(input: {
    creatorId: string;
    requestId: string;
  }): Promise<CatalogCreatorDetailViewDto | null>;
  requestIdFactory(): string;
}

interface CatalogDetailRouteContext {
  params: Promise<{ creatorId: string }>;
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

export function createCatalogDetailRouteHandler(
  dependencies: CatalogDetailRouteDependencies,
) {
  return async function GET(
    request: NextRequest,
    context: CatalogDetailRouteContext,
  ) {
    const requestId = safeRequestId(request, dependencies.requestIdFactory);
    const { creatorId } = await context.params;
    let query: { creatorId: string; requestId: string };

    if (dependencies.consumeContactCapacity) {
      const capacity = await dependencies.consumeContactCapacity();

      if (!capacity.allowed) {
        return NextResponse.json(
          {
            message:
              "Muitas consultas foram realizadas. Aguarde antes de tentar novamente.",
          },
          {
            headers: {
              ...responseHeaders(requestId),
              "retry-after": String(capacity.retryAfterSeconds),
            },
            status: 429,
          },
        );
      }
    }

    try {
      query = catalogDetailQuerySchema.parse({ creatorId, requestId });
    } catch (error) {
      const fieldErrors =
        error instanceof z.ZodError
          ? z.flattenError(error).fieldErrors
          : undefined;

      return NextResponse.json(
        { fieldErrors, message: "O perfil informado é inválido." },
        { headers: responseHeaders(requestId), status: 422 },
      );
    }

    try {
      const detail = await dependencies.load(query);

      if (!detail) {
        return NextResponse.json(
          { message: "Conteúdo indisponível." },
          { headers: responseHeaders(requestId), status: 404 },
        );
      }

      return NextResponse.json(detail, {
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
        error: "catalog_detail_read_failed",
        requestId,
      });

      return NextResponse.json(
        { message: "Não foi possível carregar este perfil agora." },
        { headers: responseHeaders(requestId), status: 500 },
      );
    }
  };
}
