import { describe, expect, it } from "vitest";

import { auditContextSchema } from "./audit-context-schema";

describe("verified audit context", () => {
  it("accepts a consistent verified admin context", () => {
    expect(
      auditContextSchema.parse({
        actorAccountId: "a0000000-0000-4000-8000-000000000001",
        actorType: "ADMIN",
        actorRole: "ADMIN",
        source: "BACKOFFICE",
        requestId: "request-1",
        reason: "Aprovação manual",
      }),
    ).toMatchObject({
      actorType: "ADMIN",
      actorRole: "ADMIN",
    });
  });

  it("rejects SYSTEM_UNKNOWN and inconsistent role claims from callers", () => {
    expect(
      auditContextSchema.safeParse({
        actorAccountId: null,
        actorType: "SYSTEM_UNKNOWN",
        actorRole: null,
        source: "DATABASE",
        requestId: "request-2",
        reason: null,
      }).success,
    ).toBe(false);

    expect(
      auditContextSchema.safeParse({
        actorAccountId: "b0000000-0000-4000-8000-000000000004",
        actorType: "ADMIN",
        actorRole: "INFLUENCER",
        source: "BACKOFFICE",
        requestId: "request-3",
        reason: "Tentativa inválida",
      }).success,
    ).toBe(false);
  });
});
