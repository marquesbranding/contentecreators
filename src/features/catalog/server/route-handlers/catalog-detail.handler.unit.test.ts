import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { CatalogCreatorDetailViewDto } from "../../types/catalog-detail-view.types";
import { createCatalogDetailRouteHandler } from "./catalog-detail.handler";

const creatorId = "10000000-0000-4000-8000-000000000001";
const detail: CatalogCreatorDetailViewDto = {
  bio: "Conteúdo.",
  contact: { reason: "VIEWER_NOT_COMPANY", status: "UNAVAILABLE" },
  creatorId,
  creatorType: "INFLUENCER",
  displayName: "Creator",
  location: { city: "Recife", state: "PE" },
  media: { avatar: null, cover: null },
  metrics: [],
  niches: [],
  socialProfiles: [],
  whatsappContactCount: 0,
};

function context(id = creatorId) {
  return { params: Promise.resolve({ creatorId: id }) };
}

describe("catalog detail Route Handler", () => {
  it("rate limits repeated contact-bearing detail requests before loading data", async () => {
    const load = vi.fn();
    const handler = createCatalogDetailRouteHandler({
      consumeContactCapacity: vi.fn().mockResolvedValue({
        allowed: false,
        retryAfterSeconds: 42,
      }),
      load,
      requestIdFactory: () => "contact-rate-limit",
    });
    const response = await handler(
      new NextRequest(`http://localhost/api/catalog/creators/${creatorId}`),
      context(),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(load).not.toHaveBeenCalled();
  });

  it("returns only a fresh private detail DTO", async () => {
    const load = vi.fn(async () => detail);
    const handler = createCatalogDetailRouteHandler({
      load,
      requestIdFactory: () => "generated-request-id",
    });
    const response = await handler(
      new NextRequest(`http://localhost/api/catalog/creators/${creatorId}`, {
        headers: { "x-request-id": "incoming-request-id" },
      }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-request-id")).toBe("incoming-request-id");
    expect(load).toHaveBeenCalledWith({
      creatorId,
      requestId: "incoming-request-id",
    });
    expect(await response.json()).toEqual(detail);
  });

  it("returns a safe not-found response after eligibility loss", async () => {
    const handler = createCatalogDetailRouteHandler({
      load: vi.fn(async () => null),
      requestIdFactory: () => "missing-request-id",
    });
    const response = await handler(
      new NextRequest(`http://localhost/api/catalog/creators/${creatorId}`),
      context(),
    );

    expect(response.status).toBe(404);
    expect(JSON.stringify(await response.json())).not.toMatch(
      /creator|profile|contact|media/iu,
    );
  });

  it.each([
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"), 403],
    [new AccountAccessError("STATUS_FORBIDDEN"), 403],
  ] as const)(
    "returns no DTO for denied direct reads",
    async (error, status) => {
      const handler = createCatalogDetailRouteHandler({
        load: vi.fn().mockRejectedValue(error),
        requestIdFactory: () => "denied-request-id",
      });
      const response = await handler(
        new NextRequest(`http://localhost/api/catalog/creators/${creatorId}`),
        context(),
      );

      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain(creatorId);
    },
  );

  it("rejects invalid path parameters without protected execution", async () => {
    const load = vi.fn(async () => detail);
    const handler = createCatalogDetailRouteHandler({
      load,
      requestIdFactory: () => "invalid-request-id",
    });
    const response = await handler(
      new NextRequest("http://localhost/api/catalog/creators/unsafe"),
      context("unsafe"),
    );

    expect(response.status).toBe(422);
    expect(load).not.toHaveBeenCalled();
  });
});
