import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import type { CnpjLookupResult } from "../../types/cnpj-lookup.types";
import { createCnpjLookupRouteHandler } from "./cnpj-lookup-route-handler";

const validCnpj = "11222333000181";

function createDependencies({
  accountId = null,
  capacityAvailable = true,
  result = { status: "not_found" },
}: {
  accountId?: string | null;
  capacityAvailable?: boolean;
  result?: CnpjLookupResult;
} = {}) {
  return {
    consumeCapacity: vi.fn(() => capacityAvailable),
    getAuthenticatedAccountId: vi.fn(async () => accountId),
    log: vi.fn(),
    lookup: vi.fn(async () => result),
    now: vi.fn().mockReturnValueOnce(1_000).mockReturnValue(1_027),
    requestIdFactory: vi.fn(() => "generated-request-id"),
  };
}

function context(cnpj = validCnpj) {
  return { params: Promise.resolve({ cnpj }) };
}

describe("CNPJ lookup Route Handler", () => {
  it("accepts an authenticated Google session and rate limits by a non-raw account key", async () => {
    const dependencies = createDependencies({
      accountId: "google-auth-user-id",
      result: {
        data: {
          city: "São Paulo",
          complement: "",
          legalName: "Empresa Exemplo Ltda.",
          neighborhood: "Centro",
          number: "100",
          postalCode: "01001000",
          segment: "Tecnologia",
          state: "SP",
          street: "Praça da Sé",
          tradeName: "Empresa Exemplo",
        },
        status: "success",
      },
    });
    const handler = createCnpjLookupRouteHandler(dependencies);

    const response = await handler(
      new NextRequest(
        `http://localhost:3000/api/company-registry/cnpj/${validCnpj}`,
        { headers: { "x-forwarded-for": "203.0.113.45" } },
      ),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "success" });
    expect(dependencies.consumeCapacity).toHaveBeenCalledWith(
      expect.stringMatching(/^account:[a-f0-9]{64}$/u),
    );
    expect(dependencies.consumeCapacity).not.toHaveBeenCalledWith(
      expect.stringContaining("google-auth-user-id"),
    );
  });

  it("allows the bounded pre-auth registration exception with a privacy-safe network key", async () => {
    const dependencies = createDependencies();
    const handler = createCnpjLookupRouteHandler(dependencies);

    const response = await handler(
      new NextRequest(
        `http://localhost:3000/api/company-registry/cnpj/${validCnpj}`,
        { headers: { "x-forwarded-for": "198.51.100.72, 10.0.0.1" } },
      ),
      context(),
    );

    expect(response.status).toBe(200);
    expect(dependencies.lookup).toHaveBeenCalledWith(validCnpj);
    expect(dependencies.consumeCapacity).toHaveBeenCalledWith(
      expect.stringMatching(/^network:[a-f0-9]{64}$/u),
    );
    expect(dependencies.consumeCapacity).not.toHaveBeenCalledWith(
      expect.stringContaining("198.51.100.72"),
    );
  });

  it("rejects invalid checksums before authentication, limiting, or provider access", async () => {
    const dependencies = createDependencies();
    const handler = createCnpjLookupRouteHandler(dependencies);

    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/company-registry/cnpj/11222333000182",
      ),
      context("11222333000182"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ status: "invalid" });
    expect(dependencies.getAuthenticatedAccountId).not.toHaveBeenCalled();
    expect(dependencies.consumeCapacity).not.toHaveBeenCalled();
    expect(dependencies.lookup).not.toHaveBeenCalled();
  });

  it("returns HTTP 429 without calling the provider when capacity is exhausted", async () => {
    const dependencies = createDependencies({ capacityAvailable: false });
    const handler = createCnpjLookupRouteHandler(dependencies);

    const response = await handler(
      new NextRequest(
        `http://localhost:3000/api/company-registry/cnpj/${validCnpj}`,
      ),
      context(),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      status: "rate_limited",
    });
    expect(dependencies.lookup).not.toHaveBeenCalled();
  });

  it("emits request-correlated telemetry without CNPJ, account, or network data", async () => {
    const dependencies = createDependencies({
      accountId: "private-account-id",
      result: { status: "timeout" },
    });
    const handler = createCnpjLookupRouteHandler(dependencies);

    const response = await handler(
      new NextRequest(
        `http://localhost:3000/api/company-registry/cnpj/${validCnpj}`,
        {
          headers: {
            "x-forwarded-for": "192.0.2.19",
            "x-request-id": "incoming-request-id",
          },
        },
      ),
      context(),
    );

    expect(response.headers.get("x-request-id")).toBe("incoming-request-id");
    expect(dependencies.log).toHaveBeenCalledWith({
      access: "authenticated",
      durationMs: 27,
      event: "company_registry_lookup",
      provider: "brasil_api",
      requestId: "incoming-request-id",
      result: "timeout",
    });

    const serializedTelemetry = JSON.stringify(
      dependencies.log.mock.calls.flat(),
    );
    expect(serializedTelemetry).not.toContain(validCnpj);
    expect(serializedTelemetry).not.toContain("private-account-id");
    expect(serializedTelemetry).not.toContain("192.0.2.19");
  });

  it("replaces a caller request ID that embeds the consulted CNPJ", async () => {
    const dependencies = createDependencies();
    const handler = createCnpjLookupRouteHandler(dependencies);

    const response = await handler(
      new NextRequest(
        `http://localhost:3000/api/company-registry/cnpj/${validCnpj}`,
        {
          headers: {
            "x-request-id": `lookup-${validCnpj}`,
          },
        },
      ),
      context(),
    );

    expect(response.headers.get("x-request-id")).toBe("generated-request-id");
    expect(JSON.stringify(dependencies.log.mock.calls)).not.toContain(
      validCnpj,
    );
  });
});
