import { describe, expect, it } from "vitest";

import {
  mapAdminEmailAttempt,
  mapAdminEmailOutboxItem,
} from "./admin-email-outbox.mapper";

describe("admin email outbox mapper", () => {
  it("maps an outbox item without recipient, payload or idempotency data", () => {
    const result = mapAdminEmailOutboxItem({
      accountId: "a0000000-0000-4000-8000-000000000001",
      attemptCount: 5,
      createdAt: new Date("2026-07-28T12:00:00.000Z"),
      dueAt: new Date("2026-07-28T13:00:00.000Z"),
      id: "90000000-0000-4000-8000-000000000001",
      maxAttempts: 5,
      sentAt: null,
      status: "DEAD_LETTER",
      template: "APPROVED",
      updatedAt: new Date("2026-07-28T12:05:00.000Z"),
    });

    expect(result).toEqual({
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
    });
    expect(JSON.stringify(result)).not.toContain("@");
    expect(JSON.stringify(result)).not.toContain("payload");
    expect(JSON.stringify(result)).not.toContain("idempotency");
  });

  it.each([
    ["PENDING", 0, 5, "PENDING_DELIVERY"],
    ["FAILED", 2, 5, "AUTOMATIC_RETRY"],
    ["DEAD_LETTER", 5, 20, "LIMIT_REACHED"],
  ] as const)(
    "explains retry eligibility for %s without making the UI authoritative",
    (status, attemptCount, maxAttempts, reason) => {
      const result = mapAdminEmailOutboxItem({
        accountId: null,
        attemptCount,
        createdAt: new Date("2026-07-28T12:00:00.000Z"),
        dueAt: new Date("2026-07-28T13:00:00.000Z"),
        id: "90000000-0000-4000-8000-000000000001",
        maxAttempts,
        sentAt: null,
        status,
        template: "APPROVED",
        updatedAt: new Date("2026-07-28T12:05:00.000Z"),
      });

      expect(result.retry).toEqual({ eligible: false, reason });
      expect(result.recipientReference).toBe("Destino do sistema");
    },
  );

  it("coarsens provider metadata into a safe operational attempt outcome", () => {
    const result = mapAdminEmailAttempt({
      attemptNumber: 3,
      attemptedAt: new Date("2026-07-28T12:05:00.000Z"),
      errorCategory: "user@example.test bearer-secret",
      latencyMs: 250,
      status: "FAILED",
    });

    expect(result).toEqual({
      attemptNumber: 3,
      attemptedAt: "2026-07-28T12:05:00.000Z",
      latencyMs: 250,
      outcome: "OTHER_FAILURE",
      status: "FAILED",
    });
    expect(JSON.stringify(result)).not.toContain("example.test");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
