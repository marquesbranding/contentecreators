import { describe, expect, it, vi } from "vitest";

import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { CompanyProfileEditInput } from "../../schemas/company-profile-edit-schema";
import type { InfluencerProfileEditInput } from "../../schemas/influencer-profile-edit-schema";
import { createAdminProfileEditService } from "./admin-profile-edit.service";

const approvedAdmin: VerifiedAccountContext = {
  accountId: "10000000-0000-4000-8000-000000000001",
  authUserId: "20000000-0000-4000-8000-000000000001",
  role: "ADMIN",
  status: "APPROVED",
};
const targetAccountId = "b0000000-0000-4000-8000-000000000004";

const influencerInput = {
  bio: "Conteúdo autoral sobre tecnologia, negócios e produtividade.",
  city: "São Paulo",
  creatorType: "INFLUENCER",
  displayName: "Creator Exemplo",
  expectedVersion: 3,
  legalName: "Creator Exemplo da Silva",
  nicheSlugs: ["tecnologia-games-e-inovacao"],
  socialChannels: [
    {
      followerCount: 42_000,
      isPrimary: true,
      platform: "INSTAGRAM",
      url: "https://instagram.com/creator-exemplo",
    },
  ],
  state: "SP",
  whatsapp: "(11) 99999-9999",
} satisfies InfluencerProfileEditInput;

const companyInput = {
  additionalLocations: [],
  city: "São Paulo",
  cnpj: "12.345.678/0001-95",
  complement: "",
  description:
    "Empresa de tecnologia que trabalha com creators em todo o Brasil.",
  employeeRange: "51_TO_200",
  expectedVersion: 4,
  legalName: "Empresa Exemplo Ltda.",
  neighborhood: "Centro",
  number: "100",
  postalCode: "01001-000",
  segment: "Tecnologia",
  socialPlatform: "LINKEDIN",
  socialUrl: "https://linkedin.com/company/empresa-exemplo",
  state: "SP",
  street: "Praça da Sé",
  tradeName: "Empresa Exemplo",
  websiteUrl: "https://empresa.example",
  whatsapp: "(11) 98888-7777",
} satisfies CompanyProfileEditInput;

function runnerWith(
  context: VerifiedAccountContext,
): VerifiedAccountTransactionRunner {
  return async (_request, work) =>
    work(
      {} as Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
      context,
    );
}

function dependencies(context = approvedAdmin) {
  return {
    companyProfiles: {
      loadApprovedProfile: vi.fn(),
      updateApprovedProfile: vi.fn().mockResolvedValue({
        kind: "updated",
        profile: { ...companyInput, coverAssetId: null, logoAssetId: null },
      }),
    },
    influencerProfiles: {
      loadApprovedProfile: vi.fn(),
      updateApprovedProfile: vi.fn().mockResolvedValue({
        kind: "updated",
        profile: {
          ...influencerInput,
          avatarAssetId: null,
          coverAssetId: null,
        },
      }),
    },
    runVerifiedTransaction: runnerWith(context),
    targets: {
      loadTarget: vi.fn(),
    },
  };
}

describe("admin profile edit service", () => {
  it("updates an influencer through the owner validation repository with admin audit attribution", async () => {
    const deps = dependencies();
    deps.targets.loadTarget.mockResolvedValue({
      role: "INFLUENCER",
      status: "PENDING_REVIEW",
    });
    const service = createAdminProfileEditService(deps);

    await service.updateInfluencerProfile({
      accountId: targetAccountId,
      input: influencerInput,
      reason: "Correção administrativa solicitada durante a revisão.",
      requestId: "admin-update-influencer",
    });

    expect(deps.influencerProfiles.updateApprovedProfile).toHaveBeenCalledWith(
      expect.anything(),
      targetAccountId,
      influencerInput,
      "admin-update-influencer",
      "Correção administrativa solicitada durante a revisão.",
      {
        actorAccountId: approvedAdmin.accountId,
        actorRole: "ADMIN",
        actorType: "ADMIN",
        reason: "Correção administrativa solicitada durante a revisão.",
        requestId: "admin-update-influencer",
        source: "BACKOFFICE",
      },
    );
  });

  it("updates a company through the same profile repository and optimistic version contract", async () => {
    const deps = dependencies();
    deps.targets.loadTarget.mockResolvedValue({
      role: "COMPANY",
      status: "APPROVED",
    });
    const service = createAdminProfileEditService(deps);

    await service.updateCompanyProfile({
      accountId: targetAccountId,
      input: companyInput,
      reason: "Ajuste administrativo confirmado com a empresa.",
      requestId: "admin-update-company",
    });

    expect(deps.companyProfiles.updateApprovedProfile).toHaveBeenCalledWith(
      expect.anything(),
      targetAccountId,
      companyInput,
      "admin-update-company",
      "Ajuste administrativo confirmado com a empresa.",
      expect.objectContaining({
        actorAccountId: approvedAdmin.accountId,
        actorRole: "ADMIN",
        actorType: "ADMIN",
        source: "BACKOFFICE",
      }),
    );
  });

  it.each([
    [
      { ...approvedAdmin, role: "COMPANY" as const },
      { role: "INFLUENCER" as const, status: "APPROVED" as const },
      "ROLE_FORBIDDEN",
    ],
    [
      approvedAdmin,
      { role: "COMPANY" as const, status: "APPROVED" as const },
      "TARGET_ROLE_MISMATCH",
    ],
    [
      approvedAdmin,
      { role: "INFLUENCER" as const, status: "BANNED" as const },
      "TARGET_NOT_EDITABLE",
    ],
  ])(
    "rejects unauthorized or ineligible influencer edits %#",
    async (actor, target, code) => {
      const deps = dependencies(actor);
      deps.targets.loadTarget.mockResolvedValue(target);
      const service = createAdminProfileEditService(deps);

      await expect(
        service.updateInfluencerProfile({
          accountId: targetAccountId,
          input: influencerInput,
          reason: "Tentativa administrativa com contexto inválido.",
          requestId: "admin-update-denied",
        }),
      ).rejects.toMatchObject({ code });
      expect(
        deps.influencerProfiles.updateApprovedProfile,
      ).not.toHaveBeenCalled();
    },
  );

  it("loads a role-specific editable profile without exposing another profile shape", async () => {
    const deps = dependencies();
    deps.targets.loadTarget.mockResolvedValue({
      role: "INFLUENCER",
      status: "CHANGES_REQUESTED",
    });
    deps.influencerProfiles.loadApprovedProfile.mockResolvedValue({
      ...influencerInput,
      avatarAssetId: null,
      coverAssetId: null,
      version: 3,
    });
    const service = createAdminProfileEditService(deps);

    await expect(
      service.loadEditableProfile({
        accountId: targetAccountId,
        requestId: "admin-load-profile",
      }),
    ).resolves.toMatchObject({
      profile: { displayName: "Creator Exemplo" },
      role: "INFLUENCER",
    });
    expect(deps.companyProfiles.loadApprovedProfile).not.toHaveBeenCalled();
  });
});
