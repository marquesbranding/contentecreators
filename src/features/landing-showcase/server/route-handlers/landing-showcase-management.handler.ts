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
  landingShowcaseCommandSchema,
  landingShowcaseManagementResponseSchema,
  type LandingShowcaseCommand,
} from "../../api/landing-showcase-management.contract";
import {
  LandingShowcaseServiceError,
  type LandingShowcaseServiceErrorCode,
} from "../services/admin-landing-showcase.service";
import { createServerAdminLandingShowcaseService } from "../services/server-admin-landing-showcase.service";

interface LandingShowcaseManagementDependencies {
  command(input: LandingShowcaseCommand, requestId: string): Promise<unknown>;
  consumeAdminCapacity?(): Promise<{
    allowed: boolean;
    retryAfterSeconds: number;
  }>;
  list(requestId: string): Promise<unknown>;
  requestIdFactory(): string;
  verifySameOrigin?(
    request: Request,
  ): { allowed: true } | { allowed: false; reason: string };
}

const serviceErrorResponses = {
  NOT_ENABLED: {
    message: "Inclua o perfil na landing antes de mudar a posição dele.",
    status: 422,
  },
  NOT_FOUND: {
    message: "Este perfil não está mais apto a aparecer na landing.",
    status: 404,
  },
  VERSION_CONFLICT: {
    message:
      "Este perfil foi alterado por outra ação. Atualize a lista e tente novamente.",
    status: 409,
  },
} as const satisfies Record<
  LandingShowcaseServiceErrorCode,
  { message: string; status: number }
>;

function safeRequestId(request: NextRequest, fallback: () => string) {
  const requestId = request.headers.get("x-request-id")?.trim();

  return requestId &&
    requestId.length <= 128 &&
    /^[a-zA-Z0-9._:-]+$/u.test(requestId)
    ? requestId
    : fallback();
}

function respond(
  body: unknown,
  requestId: string,
  status: number,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    headers: {
      "cache-control": "private, no-store",
      "x-request-id": requestId,
      ...extraHeaders,
    },
    status,
  });
}

function errorResponse(error: unknown, requestId: string) {
  if (
    error instanceof VerifiedAccountTransactionError &&
    error.code === "UNAUTHENTICATED"
  ) {
    return respond(
      { message: "Sua sessão expirou. Entre novamente." },
      requestId,
      401,
    );
  }

  if (
    error instanceof VerifiedAccountTransactionError ||
    error instanceof AccountAccessError
  ) {
    return respond(
      { message: "Você não tem permissão para gerenciar a landing page." },
      requestId,
      403,
    );
  }

  if (error instanceof LandingShowcaseServiceError) {
    const { message, status } = serviceErrorResponses[error.code];

    return respond({ message }, requestId, status);
  }

  console.error({ error: "landing_showcase_management_failed", requestId });

  return respond(
    { message: "Não foi possível concluir a operação agora." },
    requestId,
    500,
  );
}

function parseServerResponse(value: unknown, requestId: string) {
  const parsed = landingShowcaseManagementResponseSchema.safeParse(value);

  if (!parsed.success) {
    console.error({
      error: "landing_showcase_management_response_contract_failed",
      requestId,
    });
    throw new Error("LANDING_SHOWCASE_RESPONSE_CONTRACT_FAILED");
  }

  return parsed.data;
}

export function createLandingShowcaseManagementRouteHandlers(
  dependencies: LandingShowcaseManagementDependencies,
) {
  return {
    async GET(request: NextRequest) {
      const requestId = safeRequestId(request, dependencies.requestIdFactory);

      try {
        return respond(
          parseServerResponse(await dependencies.list(requestId), requestId),
          requestId,
          200,
        );
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async POST(request: NextRequest) {
      const requestId = safeRequestId(request, dependencies.requestIdFactory);

      if (
        dependencies.verifySameOrigin &&
        !dependencies.verifySameOrigin(request).allowed
      ) {
        return respond(
          { message: "Não foi possível validar a origem desta solicitação." },
          requestId,
          403,
        );
      }

      if (dependencies.consumeAdminCapacity) {
        const capacity = await dependencies.consumeAdminCapacity();

        if (!capacity.allowed) {
          return respond(
            {
              message:
                "Muitas ações administrativas foram realizadas. Aguarde antes de tentar novamente.",
            },
            requestId,
            429,
            { "retry-after": String(capacity.retryAfterSeconds) },
          );
        }
      }

      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return respond(
          { message: "Envie um corpo JSON válido." },
          requestId,
          422,
        );
      }

      const input = landingShowcaseCommandSchema.safeParse(body);

      if (!input.success) {
        return respond(
          {
            fieldErrors: z.flattenError(input.error).fieldErrors,
            message: "Revise os dados informados.",
          },
          requestId,
          422,
        );
      }

      try {
        return respond(
          parseServerResponse(
            await dependencies.command(input.data, requestId),
            requestId,
          ),
          requestId,
          200,
        );
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },
  };
}

export async function createServerLandingShowcaseManagementRouteHandlers() {
  const service = await createServerAdminLandingShowcaseService();

  return createLandingShowcaseManagementRouteHandlers({
    command: service.command,
    consumeAdminCapacity: () => consumeIdentityRateLimit("adminCommand"),
    list: service.list,
    requestIdFactory: randomUUID,
    verifySameOrigin: verifySameOriginRequest,
  });
}
