import { describe, expect, it } from "vitest";

import {
  auditHistoryFiltersSchema,
  parseAuditHistorySearchParams,
  serializeAuditHistoryFilters,
} from "./audit-history.schema";

describe("audit history filters", () => {
  it("normalizes safe defaults and canonical URL parameters", () => {
    const filters = auditHistoryFiltersSchema.parse({
      action: "UPDATE",
      actorType: "ADMIN",
      entity: "  accounts ",
      page: "",
      pageSize: "",
      periodFrom: "2026-07-01",
      periodTo: "2026-07-31",
      record: " record-1 ",
      source: "BACKOFFICE",
    });

    expect(filters).toEqual({
      action: "UPDATE",
      actorAccountId: undefined,
      actorType: "ADMIN",
      entity: "accounts",
      page: 1,
      pageSize: 20,
      periodFrom: "2026-07-01",
      periodTo: "2026-07-31",
      record: "record-1",
      source: "BACKOFFICE",
    });
    expect(serializeAuditHistoryFilters(filters).toString()).toBe(
      "entity=accounts&record=record-1&actorType=ADMIN&action=UPDATE&source=BACKOFFICE&periodFrom=2026-07-01&periodTo=2026-07-31&page=1&pageSize=20",
    );
  });

  it("bounds pagination and rejects inverted or malformed periods", () => {
    expect(() =>
      parseAuditHistorySearchParams(
        new URLSearchParams("page=1001&pageSize=51"),
      ),
    ).toThrow();
    expect(() =>
      parseAuditHistorySearchParams(
        new URLSearchParams("periodFrom=2026-08-01&periodTo=2026-07-01"),
      ),
    ).toThrow("A data inicial deve ser anterior à data final.");
    expect(() =>
      parseAuditHistorySearchParams(
        new URLSearchParams("periodFrom=not-a-date"),
      ),
    ).toThrow();
  });

  it("rejects unsafe entity and actor filters before data access", () => {
    expect(() =>
      auditHistoryFiltersSchema.parse({ entity: "accounts;drop table" }),
    ).toThrow();
    expect(() =>
      auditHistoryFiltersSchema.parse({ actorAccountId: "admin-id" }),
    ).toThrow("Informe um ID de conta válido.");
  });
});
