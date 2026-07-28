import { describe, expect, it } from "vitest";

import { authorizeCatalogViewer } from "./catalog-access.policy";

const statuses = [
  "ONBOARDING",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "SUSPENDED",
  "BANNED",
] as const;

describe("catalog access policy", () => {
  it.each(["COMPANY", "INFLUENCER"] as const)(
    "allows an approved, active %s account",
    (role) => {
      expect(
        authorizeCatalogViewer({
          accountId: "00000000-0000-4000-8000-000000000001",
          archivedAt: null,
          role,
          status: "APPROVED",
        }),
      ).toEqual({
        accountId: "00000000-0000-4000-8000-000000000001",
        role,
      });
    },
  );

  it.each(statuses)("denies the %s account status", (status) => {
    expect(() =>
      authorizeCatalogViewer({
        accountId: "00000000-0000-4000-8000-000000000001",
        archivedAt: null,
        role: "COMPANY",
        status,
      }),
    ).toThrow(expect.objectContaining({ code: "STATUS_FORBIDDEN" }));
  });

  it.each(["ADMIN", null] as const)("denies the %s role", (role) => {
    expect(() =>
      authorizeCatalogViewer({
        accountId: "00000000-0000-4000-8000-000000000001",
        archivedAt: null,
        role,
        status: "APPROVED",
      }),
    ).toThrow(expect.objectContaining({ code: "ROLE_FORBIDDEN" }));
  });

  it("denies archived accounts", () => {
    expect(() =>
      authorizeCatalogViewer({
        accountId: "00000000-0000-4000-8000-000000000001",
        archivedAt: "2026-07-28T12:00:00.000Z",
        role: "COMPANY",
        status: "APPROVED",
      }),
    ).toThrow(expect.objectContaining({ code: "ACCOUNT_REQUIRED" }));
  });
});
