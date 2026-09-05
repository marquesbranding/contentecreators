import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { DirectoryBrowserPageDto } from "../../api/catalog-directory.contract";
import { DirectoryCursorError } from "../repositories/catalog-directory-cursor";
import { createCatalogDirectoryRouteHandler } from "./catalog-directory.handler";

const emptyPage: DirectoryBrowserPageDto = {
  facets: { cities: [], niches: [], segments: [], states: [] },
  items: [],
  nextCursor: null,
  pageSize: 20,
};

describe("catalog directory Route Handler", () => {
  it("reauthorizes a canonical private directory read", async () => {
    const list = vi.fn(async () => emptyPage);
    const handler = createCatalogDirectoryRouteHandler({
      loadPage: list,
      requestIdFactory: () => "generated-request-id",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/catalog/directory?search=%20Moda%20&state=sp&type=COMPANY&type=UGC&pageSize=20",
        { headers: { "x-request-id": "incoming-request-id" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("x-request-id")).toBe("incoming-request-id");
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 20,
        search: "Moda",
        state: "SP",
        type: ["COMPANY", "UGC"],
      }),
      "incoming-request-id",
    );
  });

  it.each([
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"), 403],
    [new AccountAccessError("STATUS_FORBIDDEN"), 403],
    [new AccountAccessError("ROLE_FORBIDDEN"), 403],
  ] as const)(
    "never serializes directory data for denied reads",
    async (error, status) => {
      const handler = createCatalogDirectoryRouteHandler({
        loadPage: vi.fn().mockRejectedValue(error),
        requestIdFactory: () => "denied-request-id",
      });
      const response = await handler(
        new NextRequest("http://localhost:3000/api/catalog/directory"),
      );

      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain("items");
    },
  );

  it.each([
    ["?pageSize=51", undefined],
    ["?cursor=invalid", new DirectoryCursorError()],
    ["?type=ADMIN", undefined],
  ] as const)(
    "maps invalid filters and cursors to a safe validation response",
    async (search, listError) => {
      const list = listError
        ? vi.fn().mockRejectedValue(listError)
        : vi.fn(async () => emptyPage);
      const handler = createCatalogDirectoryRouteHandler({
        loadPage: list,
        requestIdFactory: () => "validation-request-id",
      });
      const response = await handler(
        new NextRequest(`http://localhost:3000/api/catalog/directory${search}`),
      );

      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({
        message: "Revise os filtros informados.",
      });
    },
  );
});
