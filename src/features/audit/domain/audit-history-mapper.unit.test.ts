import { describe, expect, it } from "vitest";

import { findSensitiveDataLeaks } from "@/shared/server/observability/operational-logger";

import { toAuditHistoryItem } from "./audit-history-mapper";

describe("audit history safe DTO", () => {
  it("returns changed fields only and redacts secrets and personal identifiers again", () => {
    const item = toAuditHistoryItem({
      actorAccountId: "a0000000-0000-4000-8000-000000000001",
      actorRole: "ADMIN",
      actorType: "ADMIN",
      afterState: {
        cnpj: "11222333000181",
        operational_email: "new@example.test",
        profile: {
          access_token: "secret-token",
          display_name: "Nome novo",
        },
        status: "APPROVED",
      },
      beforeState: {
        cnpj: "00999888000177",
        operational_email: "old@example.test",
        profile: {
          access_token: "old-secret",
          display_name: "Nome antigo",
        },
        status: "PENDING_REVIEW",
      },
      changedFields: ["cnpj", "operational_email", "profile", "status"],
      entityId: "b0000000-0000-4000-8000-000000000001",
      entityTable: "accounts",
      occurredAt: new Date("2026-07-28T12:00:00.000Z"),
      operation: "UPDATE",
      reason:
        "Solicitação de creator@example.test, CNPJ 11.222.333/0001-81, WhatsApp (11) 99999-8888",
      requestId: "audit-request-1",
      revision: 91,
      source: "BACKOFFICE",
    });

    expect(item).toMatchObject({
      action: "UPDATE",
      entity: "accounts",
      record: "b0000000-0000-4000-8000-000000000001",
      revision: 91,
    });
    expect(item.changes).toEqual(
      expect.arrayContaining([
        { after: "[REDACTED]", before: "[REDACTED]", field: "cnpj" },
        {
          after: "[REDACTED]",
          before: "[REDACTED]",
          field: "operational_email",
        },
        {
          after: {
            access_token: "[REDACTED]",
            display_name: "Nome novo",
          },
          before: {
            access_token: "[REDACTED]",
            display_name: "Nome antigo",
          },
          field: "profile",
        },
      ]),
    );
    expect(item.reason).toBe(
      "Solicitação de [DADO PROTEGIDO], CNPJ [DADO PROTEGIDO], WhatsApp [DADO PROTEGIDO]",
    );
    expect(JSON.stringify(item)).not.toContain("secret-token");
    expect(JSON.stringify(item)).not.toContain("example.test");
    expect(item).not.toHaveProperty("beforeState");
    expect(item).not.toHaveProperty("afterState");
    expect(findSensitiveDataLeaks(item)).toEqual([]);
  });

  it("represents absent sides as null for stable JSON serialization", () => {
    const item = toAuditHistoryItem({
      actorAccountId: null,
      actorRole: null,
      actorType: "SYSTEM",
      afterState: { display_name: "Novo" },
      beforeState: null,
      changedFields: ["display_name"],
      entityId: "record-1",
      entityTable: "creator_profiles",
      occurredAt: new Date("2026-07-28T12:00:00.000Z"),
      operation: "INSERT",
      reason: null,
      requestId: "system-request",
      revision: 92,
      source: "DATABASE",
    });

    expect(item.changes).toEqual([
      { after: "Novo", before: null, field: "display_name" },
    ]);
    expect(() => JSON.stringify(item)).not.toThrow();
  });
});
