import { describe, expect, it } from "vitest";

import {
  adminEmailOutboxDetailSchema,
  adminEmailOutboxListSchema,
  parseAdminEmailOutboxSearchParams,
  serializeAdminEmailOutboxFilters,
} from "./admin-email-outbox.schema";

const safeItem = {
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
} as const;

describe("admin email outbox schemas", () => {
  it("parses bounded URL filters and serializes canonical stable values", () => {
    const filters = parseAdminEmailOutboxSearchParams(
      new URLSearchParams({
        order: "NEXT_DUE",
        page: "2",
        pageSize: "999",
        status: "FAILED",
        template: "CHANGES_REQUESTED",
      }),
    );

    expect(filters).toEqual({
      order: "NEXT_DUE",
      page: 2,
      pageSize: 50,
      status: "FAILED",
      template: "CHANGES_REQUESTED",
    });
    expect(serializeAdminEmailOutboxFilters(filters).toString()).toBe(
      "status=FAILED&template=CHANGES_REQUESTED&order=NEXT_DUE&page=2&pageSize=50",
    );
  });

  it("rejects hidden recipient, payload, body and provider metadata", () => {
    const unsafeList = {
      counts: { DEAD_LETTER: 1, FAILED: 0, PENDING: 0 },
      items: [
        {
          ...safeItem,
          payload: { body: "segredo" },
          recipientEmail: "pessoa@example.test",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    };
    const unsafeDetail = {
      attempts: [
        {
          attemptNumber: 5,
          attemptedAt: "2026-07-28T12:05:00.000Z",
          errorCode: "TOKEN_EXPOSTO",
          latencyMs: 140,
          outcome: "CONNECTION_FAILURE",
          providerMessageIdHash: "a".repeat(64),
          responseCode: "250",
          status: "FAILED",
        },
      ],
      item: safeItem,
    };

    expect(adminEmailOutboxListSchema.safeParse(unsafeList).success).toBe(
      false,
    );
    expect(adminEmailOutboxDetailSchema.safeParse(unsafeDetail).success).toBe(
      false,
    );
  });

  it("accepts only minimized operational DTOs", () => {
    const result = adminEmailOutboxDetailSchema.parse({
      attempts: [
        {
          attemptNumber: 5,
          attemptedAt: "2026-07-28T12:05:00.000Z",
          latencyMs: 140,
          outcome: "CONNECTION_FAILURE",
          status: "FAILED",
        },
      ],
      item: safeItem,
    });

    expect(result).toEqual({
      attempts: [
        {
          attemptNumber: 5,
          attemptedAt: "2026-07-28T12:05:00.000Z",
          latencyMs: 140,
          outcome: "CONNECTION_FAILURE",
          status: "FAILED",
        },
      ],
      item: safeItem,
    });
  });
});
