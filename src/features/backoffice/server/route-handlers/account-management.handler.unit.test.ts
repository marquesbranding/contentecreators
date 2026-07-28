import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { AccountManagementResponseDto } from "../../types/account-management.types";
import { createAccountManagementRouteHandler } from "./account-management.handler";

const emptyResponse: AccountManagementResponseDto = {
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

describe("account management Route Handler", () => {
  it("returns private account data with canonical filters", async () => {
    const list = vi.fn(async () => emptyResponse);
    const handler = createAccountManagementRouteHandler({
      list,
      requestIdFactory: () => "generated-request-id",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/accounts?role=COMPANY&status=APPROVED&archive=ALL&page=2",
        { headers: { "x-request-id": "incoming-request-id" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(list).toHaveBeenCalledWith(
      {
        archive: "ALL",
        order: "NEWEST",
        page: 2,
        pageSize: 20,
        role: "COMPANY",
        search: "",
        status: "APPROVED",
      },
      "incoming-request-id",
    );
  });

  it.each([
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"), 403],
    [new AccountAccessError("ROLE_FORBIDDEN"), 403],
  ] as const)(
    "never returns items for denied direct reads",
    async (error, status) => {
      const handler = createAccountManagementRouteHandler({
        list: vi.fn().mockRejectedValue(error),
        requestIdFactory: () => "denied-request-id",
      });
      const response = await handler(
        new NextRequest("http://localhost:3000/api/backoffice/accounts"),
      );

      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain("items");
    },
  );

  it("rejects invalid URL filters without querying", async () => {
    const list = vi.fn(async () => emptyResponse);
    const handler = createAccountManagementRouteHandler({
      list,
      requestIdFactory: () => "invalid-request-id",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/accounts?archive=DELETED",
      ),
    );

    expect(response.status).toBe(422);
    expect(list).not.toHaveBeenCalled();
  });
});
