import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { AuditHistoryResponseDto } from "../../types/audit-history.types";
import { createAuditHistoryRouteHandler } from "./audit-history.handler";

const emptyResponse: AuditHistoryResponseDto = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  },
};

describe("audit history Route Handler", () => {
  it("returns private no-store data with validated canonical filters", async () => {
    const list = vi.fn(async () => emptyResponse);
    const handler = createAuditHistoryRouteHandler({
      list,
      requestIdFactory: () => "generated-request-id",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/audit?entity=accounts&record=record-1&actorType=ADMIN&action=UPDATE&source=BACKOFFICE&periodFrom=2026-07-01&periodTo=2026-07-31&page=2",
        { headers: { "x-request-id": "incoming-audit-request" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBe("incoming-audit-request");
    expect(list).toHaveBeenCalledWith(
      {
        action: "UPDATE",
        actorAccountId: undefined,
        actorType: "ADMIN",
        entity: "accounts",
        page: 2,
        pageSize: 20,
        periodFrom: "2026-07-01",
        periodTo: "2026-07-31",
        record: "record-1",
        source: "BACKOFFICE",
      },
      "incoming-audit-request",
    );
  });

  it.each([
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"), 403],
    [new AccountAccessError("ROLE_FORBIDDEN"), 403],
  ] as const)(
    "never returns audit payloads for denied direct reads",
    async (error, status) => {
      const handler = createAuditHistoryRouteHandler({
        list: vi.fn().mockRejectedValue(error),
        requestIdFactory: () => "denied-audit-request",
      });
      const response = await handler(
        new NextRequest("http://localhost:3000/api/backoffice/audit"),
      );
      const body = await response.json();

      expect(response.status).toBe(status);
      expect(body).toEqual({
        message:
          status === 401
            ? "Sua sessão expirou. Entre novamente."
            : "Você não tem permissão para consultar a auditoria.",
      });
      expect(JSON.stringify(body)).not.toContain("items");
      expect(JSON.stringify(body)).not.toContain("before");
      expect(JSON.stringify(body)).not.toContain("after");
    },
  );

  it("rejects unsafe or unbounded filters without querying", async () => {
    const list = vi.fn(async () => emptyResponse);
    const handler = createAuditHistoryRouteHandler({
      list,
      requestIdFactory: () => "invalid-audit-request",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/audit?entity=accounts%3Bdrop&pageSize=500",
      ),
    );

    expect(response.status).toBe(422);
    expect(list).not.toHaveBeenCalled();
  });
});
