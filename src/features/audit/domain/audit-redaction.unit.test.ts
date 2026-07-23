import { describe, expect, it } from "vitest";

import {
  calculateChangedFields,
  mapAuditActor,
  redactAuditSnapshot,
  toSafeAuditRevision,
} from "./audit-redaction";

describe("audit snapshot safety", () => {
  it("redacts direct and nested sensitive values without mutating input", () => {
    const snapshot = {
      display_name: "Criadora Exemplo",
      operational_email: "creator@example.test",
      cnpj: "00000000000000",
      delivery: {
        access_token: "token",
        smtp_password: "secret",
        safe_code: "temporary-provider-error",
      },
      items: [
        { signed_url: "https://storage.test/private?token=secret" },
        { label: "Seguro" },
      ],
    };

    expect(redactAuditSnapshot(snapshot)).toEqual({
      display_name: "Criadora Exemplo",
      operational_email: "[REDACTED]",
      cnpj: "[REDACTED]",
      delivery: {
        access_token: "[REDACTED]",
        smtp_password: "[REDACTED]",
        safe_code: "temporary-provider-error",
      },
      items: [{ signed_url: "[REDACTED]" }, { label: "Seguro" }],
    });
    expect(snapshot.operational_email).toBe("creator@example.test");
  });

  it("calculates a sorted union of materially changed fields", () => {
    expect(
      calculateChangedFields(
        {
          bio: "Antes",
          city: "Curitiba",
          nested: { value: 1 },
          removed: true,
        },
        {
          bio: "Depois",
          city: "Curitiba",
          nested: { value: 2 },
          added: true,
        },
      ),
    ).toEqual(["added", "bio", "nested", "removed"]);
  });

  it("maps missing or inconsistent actor context to SYSTEM_UNKNOWN", () => {
    expect(
      mapAuditActor({
        accountId: null,
        actorType: null,
        role: null,
      }),
    ).toEqual({
      accountId: null,
      actorType: "SYSTEM_UNKNOWN",
      role: null,
    });

    expect(
      mapAuditActor({
        accountId: "a0000000-0000-4000-8000-000000000001",
        actorType: "ADMIN",
        role: "ADMIN",
      }),
    ).toEqual({
      accountId: "a0000000-0000-4000-8000-000000000001",
      actorType: "ADMIN",
      role: "ADMIN",
    });
  });

  it("returns a safe presentation record rather than raw snapshots", () => {
    const result = toSafeAuditRevision({
      revision: 42,
      entityTable: "company_profiles",
      entityId: "company-id",
      operation: "UPDATE",
      actorAccountId: "admin-id",
      actorType: "ADMIN",
      actorRole: "ADMIN",
      source: "BACKOFFICE",
      requestId: "request-42",
      reason: "Correção administrativa",
      changedFields: ["cnpj", "trade_name"],
      beforeState: {
        cnpj: "00000000000000",
        trade_name: "Antes",
      },
      afterState: {
        cnpj: "11111111111111",
        trade_name: "Depois",
      },
      occurredAt: new Date("2026-07-23T12:00:00.000Z"),
    });

    expect(result).toEqual({
      revision: 42,
      entityTable: "company_profiles",
      entityId: "company-id",
      operation: "UPDATE",
      actor: {
        accountId: "admin-id",
        actorType: "ADMIN",
        role: "ADMIN",
      },
      source: "BACKOFFICE",
      requestId: "request-42",
      reason: "Correção administrativa",
      changes: {
        cnpj: {
          before: "[REDACTED]",
          after: "[REDACTED]",
        },
        trade_name: {
          before: "Antes",
          after: "Depois",
        },
      },
      occurredAt: "2026-07-23T12:00:00.000Z",
    });
    expect(result).not.toHaveProperty("beforeState");
    expect(result).not.toHaveProperty("afterState");
  });
});
