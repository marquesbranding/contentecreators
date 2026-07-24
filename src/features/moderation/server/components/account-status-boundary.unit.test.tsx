import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";

import {
  getServerCurrentAccount,
  signOutAction,
} from "@/features/identity/server";

import { AnalysisPending } from "../../components/analysis-pending";
import { BlockedAccount } from "../../components/blocked-account";
import { SuspendedAccount } from "../../components/suspended-account";
import { AccountStatusBoundary } from "./account-status-boundary";

const redirectMock = vi.hoisted(() =>
  vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/identity/server", () => ({
  getServerCurrentAccount: vi.fn(),
  signOutAction: vi.fn(),
}));

const getAccountMock = vi.mocked(getServerCurrentAccount);

describe("AccountStatusBoundary", () => {
  beforeEach(() => {
    getAccountMock.mockReset();
    redirectMock.mockClear();
  });

  it.each([
    [null, "/onboarding/role"],
    [
      { id: "account-1", role: "INFLUENCER", status: "ONBOARDING" },
      "/onboarding/influencer",
    ],
    [
      { id: "account-1", role: "COMPANY", status: "CHANGES_REQUESTED" },
      "/onboarding/company?corrections=requested",
    ],
    [{ id: "account-1", role: "ADMIN", status: "APPROVED" }, "/backoffice"],
  ] as const)("redirects %j to its safe destination", async (account, path) => {
    getAccountMock.mockResolvedValue(account);
    const renderApproved = vi.fn();

    await expect(AccountStatusBoundary({ renderApproved })).rejects.toThrow(
      `REDIRECT:${path}`,
    );
    expect(renderApproved).not.toHaveBeenCalled();
  });

  it.each([
    ["PENDING_REVIEW", AnalysisPending],
    ["SUSPENDED", SuspendedAccount],
    ["BANNED", BlockedAccount],
  ] as const)(
    "renders the %s status experience without evaluating approved content",
    async (status, component) => {
      getAccountMock.mockResolvedValue({
        id: "account-1",
        role: "INFLUENCER",
        status,
      });
      const renderApproved = vi.fn();

      const result = await AccountStatusBoundary({ renderApproved });

      expect(isValidElement(result)).toBe(true);
      if (!isValidElement<{ signOutAction?: typeof signOutAction }>(result)) {
        throw new Error("Expected one status element.");
      }
      expect(result.type).toBe(component);
      expect(renderApproved).not.toHaveBeenCalled();
      if (status !== "BANNED") {
        expect(result.props.signOutAction).toBe(signOutAction);
      }
    },
  );

  it("evaluates approved content only after the current account is approved", async () => {
    getAccountMock.mockResolvedValue({
      id: "account-1",
      role: "COMPANY",
      status: "APPROVED",
    });
    const approvedContent = { kind: "approved-content" };
    const renderApproved = vi.fn().mockResolvedValue(approvedContent);

    await expect(AccountStatusBoundary({ renderApproved })).resolves.toBe(
      approvedContent,
    );
    expect(renderApproved).toHaveBeenCalledOnce();
    expect(renderApproved).toHaveBeenCalledWith({
      id: "account-1",
      role: "COMPANY",
      status: "APPROVED",
    });
  });
});
