import "server-only";

import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";
import { consumeIdentityRateLimit } from "@/features/security/server";
import { verifySameOriginRequest } from "@/shared/server/security/same-origin-request";

import {
  parseSponsorshipManagementSearchParams,
  sponsorshipManagementResponseSchema,
  sponsorshipPlacementCommandSchema,
  sponsorshipPlacementMutationResponseSchema,
  sponsorshipPlacementWriteSchema,
  type SponsorshipManagementFilters,
  type SponsorshipManagementResponseDto,
  type SponsorshipPlacementCommand,
  type SponsorshipPlacementWriteInput,
} from "../../api/sponsorship-management.contract";
import { SponsorshipPlacementServiceError } from "../services/admin-sponsorship-placement.service";
import { createServerSponsorshipManagementViewService } from "../services/server-sponsorship-management-view.service";

interface SponsorshipManagementDependencies {
  consumeAdminCapacity?(): Promise<{
    allowed: boolean;
    retryAfterSeconds: number;
  }>;
  command(
    placementId: string,
    input: SponsorshipPlacementCommand,
    requestId: string,
  ): Promise<unknown>;
  create(
    input: SponsorshipPlacementWriteInput,
    requestId: string,
  ): Promise<unknown>;
  list(
    filters: SponsorshipManagementFilters,
    requestId: string,
  ): Promise<SponsorshipManagementResponseDto>;
  requestIdFactory(): string;
  verifySameOrigin?(
    request: Request,
  ): { allowed: true } | { allowed: false; reason: string };
  update(
    placementId: string,
    input: SponsorshipPlacementWriteInput,
    requestId: string,
  ): Promise<unknown>;
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

function errorResponse(error: unknown, requestId: string) {
  const headers = responseHeaders(requestId);

  if (
    error instanceof VerifiedAccountTransactionError &&
    error.code === "UNAUTHENTICATED"
  ) {
    return NextResponse.json(
      { message: "Sua sessão expirou. Entre novamente." },
      { headers, status: 401 },
    );
  }

  if (
    error instanceof VerifiedAccountTransactionError ||
    error instanceof AccountAccessError
  ) {
    return NextResponse.json(
      { message: "Você não tem permissão para gerenciar patrocínios." },
      { headers, status: 403 },
    );
  }

  if (error instanceof SponsorshipPlacementServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "VERSION_CONFLICT"
          ? 409
          : 422;
    const message =
      error.code === "VERSION_CONFLICT"
        ? "O placement foi alterado. Atualize os dados e tente novamente."
        : error.code === "INVALID_ACTIVATION"
          ? "O placement ainda não atende aos requisitos de ativação."
          : error.code === "NOT_FOUND"
            ? "O placement não foi encontrado."
            : "Revise os dados e o motivo informados.";

    return NextResponse.json({ message }, { headers, status });
  }

  console.error({
    error: "sponsorship_management_failed",
    requestId,
  });

  return NextResponse.json(
    { message: "Não foi possível concluir a operação agora." },
    { headers, status: 500 },
  );
}

function validationResponse(error: z.ZodError, requestId: string) {
  return NextResponse.json(
    {
      fieldErrors: z.flattenError(error).fieldErrors,
      message: "Revise os dados informados.",
    },
    { headers: responseHeaders(requestId), status: 422 },
  );
}

function malformedJsonResponse(requestId: string) {
  return NextResponse.json(
    { message: "Envie um corpo JSON válido." },
    { headers: responseHeaders(requestId), status: 422 },
  );
}

function sameOriginResponse(requestId: string) {
  return NextResponse.json(
    { message: "Não foi possível validar a origem desta solicitação." },
    { headers: responseHeaders(requestId), status: 403 },
  );
}

function rateLimitResponse(requestId: string, retryAfterSeconds: number) {
  return NextResponse.json(
    {
      message:
        "Muitas ações administrativas foram realizadas. Aguarde antes de tentar novamente.",
    },
    {
      headers: {
        ...responseHeaders(requestId),
        "retry-after": String(retryAfterSeconds),
      },
      status: 429,
    },
  );
}

async function verifyMutationRequest(
  dependencies: SponsorshipManagementDependencies,
  request: NextRequest,
  requestId: string,
) {
  if (
    dependencies.verifySameOrigin &&
    !dependencies.verifySameOrigin(request).allowed
  ) {
    return sameOriginResponse(requestId);
  }

  if (dependencies.consumeAdminCapacity) {
    const capacity = await dependencies.consumeAdminCapacity();

    if (!capacity.allowed) {
      return rateLimitResponse(requestId, capacity.retryAfterSeconds);
    }
  }

  return null;
}

function parseServerResponse<T>(
  result: z.ZodType<T>,
  value: unknown,
  requestId: string,
) {
  const parsed = result.safeParse(value);

  if (!parsed.success) {
    console.error({
      error: "sponsorship_management_response_contract_failed",
      requestId,
    });
    throw new Error("SPONSORSHIP_MANAGEMENT_RESPONSE_CONTRACT_FAILED");
  }

  return parsed.data;
}

const placementIdSchema = z.uuid("Identificador de placement inválido.");

export function createSponsorshipManagementRouteHandlers(
  dependencies: SponsorshipManagementDependencies,
) {
  return {
    async GET(request: NextRequest) {
      const requestId = safeRequestId(request, dependencies.requestIdFactory);

      try {
        const filters = parseSponsorshipManagementSearchParams(
          request.nextUrl.searchParams,
        );
        const result = parseServerResponse(
          sponsorshipManagementResponseSchema,
          await dependencies.list(filters, requestId),
          requestId,
        );

        return NextResponse.json(result, {
          headers: responseHeaders(requestId),
          status: 200,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return validationResponse(error, requestId);
        }
        return errorResponse(error, requestId);
      }
    },

    async POST(request: NextRequest) {
      const requestId = safeRequestId(request, dependencies.requestIdFactory);
      const denied = await verifyMutationRequest(
        dependencies,
        request,
        requestId,
      );
      if (denied) return denied;

      try {
        const input = sponsorshipPlacementWriteSchema
          .omit({ expectedVersion: true })
          .parse(await request.json());
        const result = parseServerResponse(
          sponsorshipPlacementMutationResponseSchema,
          await dependencies.create(input, requestId),
          requestId,
        );

        return NextResponse.json(result, {
          headers: responseHeaders(requestId),
          status: 201,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return validationResponse(error, requestId);
        }
        if (error instanceof SyntaxError) {
          return malformedJsonResponse(requestId);
        }
        return errorResponse(error, requestId);
      }
    },

    async PATCH(request: NextRequest, placementId: string) {
      const requestId = safeRequestId(request, dependencies.requestIdFactory);
      const denied = await verifyMutationRequest(
        dependencies,
        request,
        requestId,
      );
      if (denied) return denied;

      try {
        const safePlacementId = placementIdSchema.parse(placementId);
        const input = sponsorshipPlacementWriteSchema
          .required({ expectedVersion: true })
          .parse(await request.json());
        const result = parseServerResponse(
          sponsorshipPlacementMutationResponseSchema,
          await dependencies.update(safePlacementId, input, requestId),
          requestId,
        );

        return NextResponse.json(result, {
          headers: responseHeaders(requestId),
          status: 200,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return validationResponse(error, requestId);
        }
        if (error instanceof SyntaxError) {
          return malformedJsonResponse(requestId);
        }
        return errorResponse(error, requestId);
      }
    },

    async COMMAND(request: NextRequest, placementId: string) {
      const requestId = safeRequestId(request, dependencies.requestIdFactory);
      const denied = await verifyMutationRequest(
        dependencies,
        request,
        requestId,
      );
      if (denied) return denied;

      try {
        const safePlacementId = placementIdSchema.parse(placementId);
        const input = sponsorshipPlacementCommandSchema.parse(
          await request.json(),
        );
        const result = parseServerResponse(
          sponsorshipPlacementMutationResponseSchema,
          await dependencies.command(safePlacementId, input, requestId),
          requestId,
        );

        return NextResponse.json(result, {
          headers: responseHeaders(requestId),
          status: 200,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return validationResponse(error, requestId);
        }
        if (error instanceof SyntaxError) {
          return malformedJsonResponse(requestId);
        }
        return errorResponse(error, requestId);
      }
    },
  };
}

export async function createServerSponsorshipManagementRouteHandlers() {
  const service = await createServerSponsorshipManagementViewService();

  return createSponsorshipManagementRouteHandlers({
    command: service.command,
    consumeAdminCapacity: () => consumeIdentityRateLimit("adminCommand"),
    create: service.create,
    list: service.list,
    requestIdFactory: randomUUID,
    update: service.update,
    verifySameOrigin: verifySameOriginRequest,
  });
}
