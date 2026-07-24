import { describe, expect, it } from "vitest";

import type {
  CurrentAccountDto,
  CurrentSessionDto,
} from "../../types/current-account.types";
import {
  AccountAccessError,
  requireAccount,
  requireAdmin,
  requireAllowedStatus,
  requireApproved,
  requireAuthenticated,
  requireOwner,
  requireRole,
} from "./account-access.guards";

const approvedCompany: CurrentAccountDto = {
  id: "c0000000-0000-4000-8000-000000000004",
  role: "COMPANY",
  status: "APPROVED",
};
const approvedAdmin: CurrentAccountDto = {
  id: "a0000000-0000-4000-8000-000000000001",
  role: "ADMIN",
  status: "APPROVED",
};

describe("account access guards", () => {
  it("requires an authenticated session without requiring completed first access", () => {
    const firstAccessSession: CurrentSessionDto = {
      account: null,
      kind: "authenticated",
    };

    expect(requireAuthenticated(firstAccessSession)).toBe(firstAccessSession);
    expect(() =>
      requireAuthenticated({ account: null, kind: "anonymous" }),
    ).toThrow(new AccountAccessError("AUTHENTICATION_REQUIRED"));
  });

  it("requires a resolved application account", () => {
    expect(
      requireAccount({
        account: approvedCompany,
        kind: "authenticated",
      }),
    ).toBe(approvedCompany);
    expect(() =>
      requireAccount({ account: null, kind: "authenticated" }),
    ).toThrow(new AccountAccessError("ACCOUNT_REQUIRED"));
  });

  it("allows only the account that owns the target aggregate", () => {
    expect(requireOwner(approvedCompany, approvedCompany.id)).toBe(
      approvedCompany,
    );
    expect(() =>
      requireOwner(approvedCompany, "c0000000-0000-4000-8000-000000000003"),
    ).toThrow(new AccountAccessError("OWNERSHIP_FORBIDDEN"));
  });

  it("requires approved status for catalog capabilities", () => {
    expect(requireApproved(approvedCompany)).toBe(approvedCompany);
    expect(() =>
      requireApproved({
        ...approvedCompany,
        status: "PENDING_REVIEW",
      }),
    ).toThrow(new AccountAccessError("STATUS_FORBIDDEN"));
  });

  it("accepts one of the explicitly allowed roles", () => {
    expect(requireRole(approvedCompany, ["COMPANY", "ADMIN"])).toBe(
      approvedCompany,
    );
    expect(() => requireRole(approvedCompany, ["INFLUENCER"])).toThrow(
      new AccountAccessError("ROLE_FORBIDDEN"),
    );
  });

  it("requires a current approved administrator", () => {
    expect(requireAdmin(approvedAdmin)).toBe(approvedAdmin);
    expect(() => requireAdmin(approvedCompany)).toThrow(
      new AccountAccessError("ROLE_FORBIDDEN"),
    );
    expect(() =>
      requireAdmin({
        ...approvedAdmin,
        status: "SUSPENDED",
      }),
    ).toThrow(new AccountAccessError("STATUS_FORBIDDEN"));
  });

  it("allows only the statuses named by the use case", () => {
    const correctionsAccount: CurrentAccountDto = {
      ...approvedCompany,
      status: "CHANGES_REQUESTED",
    };

    expect(
      requireAllowedStatus(correctionsAccount, [
        "ONBOARDING",
        "CHANGES_REQUESTED",
      ]),
    ).toBe(correctionsAccount);
    expect(() =>
      requireAllowedStatus(correctionsAccount, ["APPROVED"]),
    ).toThrow(new AccountAccessError("STATUS_FORBIDDEN"));
  });
});
