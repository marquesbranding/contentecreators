import { describe, expect, it, vi } from "vitest";

import {
  AccountAccessError,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { CompanyDetailRecord } from "../repositories/company-detail.repository";
import { createCompanyDetailService } from "./company-detail.service";

const companyId = "20000000-0000-4000-8000-000000000002";
const requestId = "company-detail-request";
const record: CompanyDetailRecord = {
  city: "Curitiba",
  companyId,
  coverAssetId: null,
  description: "Empresa sintética aprovada para o catálogo.",
  displayName: "Empresa Aprovada",
  email: "empresa@example.com",
  logoAssetId: null,
  media: [],
  segment: "Tecnologia",
  state: "PR",
  websiteUrl: null,
  whatsappE164: null,
};

function createRunner(
  role: "ADMIN" | "COMPANY" | "INFLUENCER",
  status: "APPROVED" | "PENDING_REVIEW" = "APPROVED",
) {
  return (async (_input, work) =>
    work({} as Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0], {
      accountId: "10000000-0000-4000-8000-000000000001",
      authUserId: "30000000-0000-4000-8000-000000000003",
      role,
      status,
    })) satisfies VerifiedAccountTransactionRunner;
}

describe("company detail service", () => {
  it.each(["COMPANY", "INFLUENCER"] as const)(
    "loads an approved company for an approved %s viewer of the unified catalog",
    async (role) => {
      const findEligibleCompany = vi.fn().mockResolvedValue(record);
      const service = createCompanyDetailService({
        findEligibleCompany,
        runVerifiedAccountTransaction: createRunner(role),
      });

      await expect(
        service.load({ companyId, requestId }),
      ).resolves.toMatchObject({
        companyId,
        displayName: "Empresa Aprovada",
      });
      expect(findEligibleCompany).toHaveBeenCalledWith({}, companyId);
    },
  );

  it("rejects viewers outside the catalog roles or not yet approved", async () => {
    const findEligibleCompany = vi.fn();

    await expect(
      createCompanyDetailService({
        findEligibleCompany,
        runVerifiedAccountTransaction: createRunner("ADMIN"),
      }).load({ companyId, requestId }),
    ).rejects.toEqual(new AccountAccessError("ROLE_FORBIDDEN"));
    await expect(
      createCompanyDetailService({
        findEligibleCompany,
        runVerifiedAccountTransaction: createRunner(
          "COMPANY",
          "PENDING_REVIEW",
        ),
      }).load({ companyId, requestId }),
    ).rejects.toBeInstanceOf(AccountAccessError);
    expect(findEligibleCompany).not.toHaveBeenCalled();
  });
});
