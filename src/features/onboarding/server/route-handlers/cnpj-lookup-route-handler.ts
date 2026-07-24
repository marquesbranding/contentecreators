import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import { isValidCnpj, normalizeCnpj } from "../../domain/cnpj";
import type { CnpjLookupResult } from "../../types/cnpj-lookup.types";
import { createServerBrasilApiCnpjService } from "../services/brasil-api-cnpj.service";
import { consumeCnpjLookupCapacity } from "../services/cnpj-lookup-rate-limit";

type CnpjLookupTelemetry = {
  access: "authenticated" | "pre_auth";
  durationMs: number;
  event: "company_registry_lookup";
  provider: "brasil_api";
  requestId: string;
  result: CnpjLookupResult["status"];
};

type CnpjLookupRouteDependencies = {
  consumeCapacity: (key: string) => boolean;
  getAuthenticatedAccountId: () => Promise<string | null>;
  log: (event: CnpjLookupTelemetry) => void;
  lookup: (cnpj: string) => Promise<CnpjLookupResult>;
  now: () => number;
  requestIdFactory: () => string;
};

type CnpjLookupRouteContext = {
  params: Promise<{ cnpj: string }>;
};

function safeRequestId(
  request: NextRequest,
  sensitiveValue: string,
  fallback: () => string,
) {
  const requestId = request.headers.get("x-request-id")?.trim();

  if (
    requestId &&
    requestId.length <= 128 &&
    /^[a-zA-Z0-9._:-]+$/u.test(requestId) &&
    !requestId.includes(sensitiveValue)
  ) {
    return requestId;
  }

  return fallback();
}

function privacySafeCapacityKey(
  access: "account" | "network",
  rawValue: string,
) {
  const digest = createHash("sha256").update(rawValue).digest("hex");
  return `${access}:${digest}`;
}

function networkIdentity(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

function cacheControl(result: CnpjLookupResult) {
  return result.status === "success"
    ? "private, max-age=300, stale-while-revalidate=600"
    : "no-store";
}

function responseStatus(result: CnpjLookupResult) {
  if (result.status === "invalid") {
    return 400;
  }

  if (result.status === "rate_limited") {
    return 429;
  }

  return 200;
}

function jsonResponse(
  result: CnpjLookupResult,
  requestId: string,
): NextResponse<CnpjLookupResult> {
  const headers: Record<string, string> = {
    "cache-control": cacheControl(result),
    "x-request-id": requestId,
  };

  if (result.status === "rate_limited") {
    headers["retry-after"] = "60";
  }

  return NextResponse.json(result, {
    headers,
    status: responseStatus(result),
  });
}

export function createCnpjLookupRouteHandler(
  dependencies: CnpjLookupRouteDependencies,
) {
  return async function GET(
    request: NextRequest,
    context: CnpjLookupRouteContext,
  ) {
    const startedAt = dependencies.now();
    const { cnpj: rawCnpj } = await context.params;
    const normalizedCnpj = normalizeCnpj(rawCnpj);
    const requestId = safeRequestId(
      request,
      normalizedCnpj,
      dependencies.requestIdFactory,
    );

    if (!isValidCnpj(rawCnpj)) {
      return jsonResponse({ status: "invalid" }, requestId);
    }

    const accountId = await dependencies.getAuthenticatedAccountId();
    const access = accountId ? "authenticated" : "pre_auth";
    const capacityKey = accountId
      ? privacySafeCapacityKey("account", accountId)
      : privacySafeCapacityKey("network", networkIdentity(request));

    const result = dependencies.consumeCapacity(capacityKey)
      ? await dependencies.lookup(normalizedCnpj)
      : ({ status: "rate_limited" } satisfies CnpjLookupResult);

    dependencies.log({
      access,
      durationMs: Math.max(0, dependencies.now() - startedAt),
      event: "company_registry_lookup",
      provider: "brasil_api",
      requestId,
      result: result.status,
    });

    return jsonResponse(result, requestId);
  };
}

export function createServerCnpjLookupRouteHandler() {
  const service = createServerBrasilApiCnpjService();

  return createCnpjLookupRouteHandler({
    consumeCapacity: consumeCnpjLookupCapacity,
    async getAuthenticatedAccountId() {
      try {
        const client = await createServerSupabaseClient();
        const {
          data: { user },
        } = await client.auth.getUser();

        return user?.id ?? null;
      } catch {
        return null;
      }
    },
    log(event) {
      console.info(event);
    },
    lookup: (cnpj) => service.lookup(cnpj),
    now: Date.now,
    requestIdFactory: randomUUID,
  });
}
