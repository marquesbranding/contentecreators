import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { CreatorCatalogBrowserPageDto } from "../../api/creator-catalog.contract";
import { CreatorCatalogCursorError } from "../repositories/creator-catalog-cursor";
import { createCreatorCatalogRouteHandler } from "./creator-catalog.handler";

const emptyPage: CreatorCatalogBrowserPageDto = {
  items: [],
  nextCursor: null,
  pageSize: 20,
};

describe("creator catalog Route Handler", () => {
  it("reauthorizes a canonical private catalog read", async () => {
    const list = vi.fn(async () => emptyPage);
    const handler = createCreatorCatalogRouteHandler({
      loadPage: list,
      requestIdFactory: () => "generated-request-id",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/catalog/creators?search=%20Moda%20&state=sp&pageSize=20",
        { headers: { "x-request-id": "incoming-request-id" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("x-request-id")).toBe("incoming-request-id");
    expect(list).toHaveBeenCalledWith(
      {
        city: undefined,
        creatorType: undefined,
        cursor: undefined,
        niche: undefined,
        pageSize: 20,
        platform: undefined,
        search: "Moda",
        state: "SP",
      },
      "incoming-request-id",
    );
  });

  it.each([
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"), 403],
    [new AccountAccessError("STATUS_FORBIDDEN"), 403],
    [new AccountAccessError("ROLE_FORBIDDEN"), 403],
  ] as const)(
    "never serializes catalog data for denied reads",
    async (error, status) => {
      const handler = createCreatorCatalogRouteHandler({
        loadPage: vi.fn().mockRejectedValue(error),
        requestIdFactory: () => "denied-request-id",
      });
      const response = await handler(
        new NextRequest("http://localhost:3000/api/catalog/creators"),
      );

      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain("items");
    },
  );

  it.each([
    ["?pageSize=51", undefined],
    ["?cursor=invalid", new CreatorCatalogCursorError()],
  ] as const)(
    "maps invalid filters and cursors to a safe validation response",
    async (search, listError) => {
      const list = listError
        ? vi.fn().mockRejectedValue(listError)
        : vi.fn(async () => emptyPage);
      const handler = createCreatorCatalogRouteHandler({
        loadPage: list,
        requestIdFactory: () => "validation-request-id",
      });
      const response = await handler(
        new NextRequest(`http://localhost:3000/api/catalog/creators${search}`),
      );

      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({
        message: "Revise os filtros informados.",
      });
    },
  );
});
