import { describe, expect, it } from "vitest";

import {
  VerifiedAccountTransactionError,
  type VerifiedAccountContext,
  type VerifiedAccountTransactionRunner,
} from "../services/verified-account-transaction";
import { createCurrentAccountDal } from "./current-account";

const approvedCompanyContext: VerifiedAccountContext = {
  accountId: "c0000000-0000-4000-8000-000000000004",
  authUserId: "30000000-0000-4000-8000-000000000004",
  role: "COMPANY",
  status: "APPROVED",
};

function runnerReturning(
  accountContext: VerifiedAccountContext,
): VerifiedAccountTransactionRunner {
  return async (_input, work) =>
    work(
      {} as Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
      accountContext,
    );
}

function runnerRejecting(error: Error): VerifiedAccountTransactionRunner {
  return async () => {
    throw error;
  };
}

describe("current account DAL", () => {
  it("returns only the minimal account DTO for an authenticated account", async () => {
    const dal = createCurrentAccountDal({
      runVerifiedAccountTransaction: runnerReturning(approvedCompanyContext),
    });

    await expect(
      dal.resolveCurrentSession({
        requestId: "current-account-unit",
      }),
    ).resolves.toEqual({
      account: {
        id: approvedCompanyContext.accountId,
        role: "COMPANY",
        status: "APPROVED",
      },
      kind: "authenticated",
    });
  });

  it("maps a failed token validation to an anonymous session", async () => {
    const dal = createCurrentAccountDal({
      runVerifiedAccountTransaction: runnerRejecting(
        new VerifiedAccountTransactionError("UNAUTHENTICATED"),
      ),
    });

    await expect(
      dal.resolveCurrentSession({
        requestId: "anonymous-session-unit",
      }),
    ).resolves.toEqual({
      account: null,
      kind: "anonymous",
    });
  });

  it("keeps a verified first-access identity authenticated without inventing an account DTO", async () => {
    const dal = createCurrentAccountDal({
      runVerifiedAccountTransaction: runnerRejecting(
        new VerifiedAccountTransactionError("ACCOUNT_NOT_READY"),
      ),
    });

    await expect(
      dal.resolveCurrentSession({
        requestId: "first-access-session-unit",
      }),
    ).resolves.toEqual({
      account: null,
      kind: "authenticated",
    });
  });

  it("does not disguise unexpected database failures as authentication outcomes", async () => {
    const dal = createCurrentAccountDal({
      runVerifiedAccountTransaction: runnerRejecting(
        new Error("database unavailable"),
      ),
    });

    await expect(
      dal.resolveCurrentSession({
        requestId: "database-failure-unit",
      }),
    ).rejects.toThrow("database unavailable");
  });
});
