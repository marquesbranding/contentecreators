import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";

import type {
  AdminEmailOutboxDetailDto,
  AdminEmailOutboxListDto,
} from "../../types/admin-email-outbox.types";
import {
  createAdminEmailOutboxDetailRouteHandler,
  createAdminEmailOutboxListRouteHandler,
} from "./admin-email-outbox.handler";

const emptyList: AdminEmailOutboxListDto = {
  counts: { DEAD_LETTER: 0, FAILED: 0, PENDING: 0 },
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};
const detail: AdminEmailOutboxDetailDto = {
  attempts: [],
  item: {
    attemptCount: 5,
    createdAt: "2026-07-28T12:00:00.000Z",
    dueAt: "2026-07-28T13:00:00.000Z",
    id: "90000000-0000-4000-8000-000000000001",
    maxAttempts: 5,
    recipientReference: "Conta 00000001",
    reference: "E-mail #90000000",
    retry: { eligible: true, reason: "ELIGIBLE" },
    status: "DEAD_LETTER",
    template: "APPROVED",
    updatedAt: "2026-07-28T12:05:00.000Z",
  },
};

describe("admin email outbox Route Handlers", () => {
  it("returns a no-store filtered list with a safe request ID", async () => {
    const list = vi.fn(async () => emptyList);
    const handler = createAdminEmailOutboxListRouteHandler({
      list,
      requestIdFactory: () => "generated-request-id",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/emails?status=FAILED&page=2",
        { headers: { "x-request-id": "incoming-request-id" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(list).toHaveBeenCalledWith(
      {
        order: "ATTENTION_FIRST",
        page: 2,
        pageSize: 20,
        status: "FAILED",
        template: undefined,
      },
      "incoming-request-id",
    );
  });

  it("validates detail identifiers before protected reads", async () => {
    const findDetail = vi.fn(async () => detail);
    const handler = createAdminEmailOutboxDetailRouteHandler({
      findDetail,
      requestIdFactory: () => "detail-request-id",
    });
    const response = await handler(
      new NextRequest("http://localhost:3000/api/backoffice/emails/unsafe"),
      "unsafe",
    );

    expect(response.status).toBe(422);
    expect(findDetail).not.toHaveBeenCalled();
  });

  it("returns a safe not-found response for unavailable detail", async () => {
    const handler = createAdminEmailOutboxDetailRouteHandler({
      findDetail: vi.fn(async () => null),
      requestIdFactory: () => "detail-request-id",
    });
    const response = await handler(
      new NextRequest(
        "http://localhost:3000/api/backoffice/emails/90000000-0000-4000-8000-000000000001",
      ),
      "90000000-0000-4000-8000-000000000001",
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      message: "Não foi possível localizar esta mensagem operacional.",
    });
  });

  it.each([
    [new VerifiedAccountTransactionError("UNAUTHENTICATED"), 401],
    [new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"), 403],
    [new AccountAccessError("ROLE_FORBIDDEN"), 403],
  ] as const)(
    "does not serialize outbox data after authorization loss",
    async (error, status) => {
      const handler = createAdminEmailOutboxListRouteHandler({
        list: vi.fn().mockRejectedValue(error),
        requestIdFactory: () => "denied-request-id",
      });
      const response = await handler(
        new NextRequest("http://localhost:3000/api/backoffice/emails"),
      );
      const body = await response.json();

      expect(response.status).toBe(status);
      expect(JSON.stringify(body)).not.toContain("items");
      expect(JSON.stringify(body)).not.toContain("attempts");
      expect(JSON.stringify(body)).not.toContain("recipient");
    },
  );
});
