import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { CompanyCarouselViewResponseDto } from "../../types/company-carousel-view.types";
import { createCompanyCarouselRouteHandler } from "./company-carousel.handler";

const responseDto: CompanyCarouselViewResponseDto = {
  items: [],
  limit: 12,
};

describe("company carousel Route Handler", () => {
  it("returns a bounded private carousel with no-store headers", async () => {
    const list = vi.fn(async () => responseDto);
    const handler = createCompanyCarouselRouteHandler({
      list,
      requestIdFactory: () => "generated-request-id",
    });
    const response = await handler(
      new NextRequest("http://localhost/api/catalog/companies?limit=18", {
        headers: { "x-request-id": "incoming-request-id" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(list).toHaveBeenCalledWith({ limit: 18 }, "incoming-request-id");
    expect(await response.json()).toEqual(responseDto);
  });

  it.each([
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new AccountAccessError("ROLE_FORBIDDEN"), 403],
  ] as const)(
    "returns no company payload for denied viewers",
    async (error, status) => {
      const handler = createCompanyCarouselRouteHandler({
        list: vi.fn().mockRejectedValue(error),
        requestIdFactory: () => "denied-request-id",
      });
      const response = await handler(
        new NextRequest("http://localhost/api/catalog/companies"),
      );

      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain("items");
    },
  );
});
