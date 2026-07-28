import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type { ModerationQueueResponseDto } from "../../types/moderation-queue.types";
import { createModerationQueueRouteHandler } from "./moderation-queue.handler";

const emptyResponse: ModerationQueueResponseDto = {
  counts: {
    byRole: { COMPANY: 0, INFLUENCER: 0 },
    byStatus: {
      APPROVED: 0,
      BANNED: 0,
      CHANGES_REQUESTED: 0,
      PENDING_REVIEW: 0,
      SUSPENDED: 0,
    },
  },
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

describe("moderation queue Route Handler", () => {
  it("returns no-store queue data with canonical filters", async () => {
    const list = vi.fn(async () => emptyResponse);
    const handler = createModerationQueueRouteHandler({
      list,
      requestIdFactory: () => "generated-request-id",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/moderation?role=COMPANY&status=PENDING_REVIEW&page=2",
        { headers: { "x-request-id": "incoming-request-id" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBe("incoming-request-id");
    expect(list).toHaveBeenCalledWith(
      {
        order: "PENDING_FIRST",
        page: 2,
        pageSize: 20,
        role: "COMPANY",
        search: "",
        status: "PENDING_REVIEW",
      },
      "incoming-request-id",
    );
  });

  it.each([
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"), 403],
    [new AccountAccessError("ROLE_FORBIDDEN"), 403],
  ] as const)(
    "clears queue data for denied direct reads",
    async (error, status) => {
      const handler = createModerationQueueRouteHandler({
        list: vi.fn().mockRejectedValue(error),
        requestIdFactory: () => "denied-request-id",
      });
      const response = await handler(
        new NextRequest(
          "http://localhost:3000/api/backoffice/moderation?role=INFLUENCER",
        ),
      );

      expect(response.status).toBe(status);
      const body = await response.json();
      expect(body).toEqual({
        message:
          status === 401
            ? "Sua sessão expirou. Entre novamente."
            : "Você não tem permissão para acessar esta fila.",
      });
      expect(JSON.stringify(body)).not.toContain("items");
    },
  );

  it("returns a safe validation response without querying", async () => {
    const list = vi.fn(async () => emptyResponse);
    const handler = createModerationQueueRouteHandler({
      list,
      requestIdFactory: () => "invalid-request-id",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/moderation?role=ADMIN&page=-1",
      ),
    );

    expect(response.status).toBe(422);
    expect(list).not.toHaveBeenCalled();
  });
});
