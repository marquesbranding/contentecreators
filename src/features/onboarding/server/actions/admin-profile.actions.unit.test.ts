import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerAdminProfileEditService } from "../services/server-admin-profile-edit.service";
import {
  updateCompanyProfileAsAdminAction,
  updateInfluencerProfileAsAdminAction,
} from "./admin-profile.actions";

vi.mock("../services/server-admin-profile-edit.service", () => ({
  createServerAdminProfileEditService: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockedCreateService = vi.mocked(createServerAdminProfileEditService);
const accountId = "b0000000-0000-4000-8000-000000000004";

function influencerForm() {
  const formData = new FormData();
  const values = {
    bio: "Conteúdo autoral sobre tecnologia, negócios e produtividade.",
    city: "São Paulo",
    creatorType: "INFLUENCER",
    displayName: "Creator Exemplo",
    expectedVersion: "3",
    followers: "42000",
    legalName: "Creator Exemplo da Silva",
    reason: "Correção administrativa confirmada durante a revisão.",
    "socialChannels.INSTAGRAM.selected": "on",
    "socialChannels.INSTAGRAM.url": "https://instagram.com/creator-exemplo",
    state: "SP",
    whatsapp: "(11) 99999-9999",
  };
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  formData.append("nicheSlugs", "tecnologia-games-e-inovacao");
  return formData;
}

function companyForm() {
  const formData = new FormData();
  const values = {
    city: "São Paulo",
    cnpj: "12.345.678/0001-95",
    complement: "",
    description:
      "Empresa de tecnologia que trabalha com creators em todo o Brasil.",
    employeeRange: "51_TO_200",
    expectedVersion: "4",
    legalName: "Empresa Exemplo Ltda.",
    neighborhood: "Centro",
    number: "100",
    postalCode: "01001-000",
    reason: "Ajuste administrativo confirmado com a empresa.",
    segment: "Tecnologia",
    socialPlatform: "LINKEDIN",
    socialUrl: "https://linkedin.com/company/empresa-exemplo",
    state: "SP",
    street: "Praça da Sé",
    tradeName: "Empresa Exemplo",
    websiteUrl: "https://empresa.example",
    whatsapp: "(11) 98888-7777",
  };
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("admin profile edit actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a visible administrative reason before invoking the service", async () => {
    const formData = influencerForm();
    formData.set("reason", "");

    await expect(
      updateInfluencerProfileAsAdminAction(
        accountId,
        { status: "idle" },
        formData,
      ),
    ).resolves.toMatchObject({
      fieldErrors: { reason: expect.any(Array) },
      status: "error",
    });
    expect(mockedCreateService).not.toHaveBeenCalled();
  });

  it("validates and delegates an influencer update without returning profile data", async () => {
    const updateInfluencerProfile = vi.fn().mockResolvedValue({
      kind: "updated",
      profile: { version: 4 },
    });
    mockedCreateService.mockResolvedValue({
      loadEditableProfile: vi.fn(),
      updateCompanyProfile: vi.fn(),
      updateInfluencerProfile,
    } as never);

    await expect(
      updateInfluencerProfileAsAdminAction(
        accountId,
        { status: "idle" },
        influencerForm(),
      ),
    ).resolves.toEqual({
      message: "Perfil do creator atualizado com sucesso.",
      profileVersion: 4,
      status: "success",
    });
    expect(updateInfluencerProfile).toHaveBeenCalledWith({
      accountId,
      input: expect.objectContaining({
        expectedVersion: 3,
        nicheSlugs: ["tecnologia-games-e-inovacao"],
      }),
      reason: "Correção administrativa confirmada durante a revisão.",
      requestId: expect.any(String),
    });
  });

  it("returns a safe stale-version response for company edits", async () => {
    mockedCreateService.mockResolvedValue({
      loadEditableProfile: vi.fn(),
      updateCompanyProfile: vi.fn().mockResolvedValue({
        currentVersion: 8,
        kind: "conflict",
      }),
      updateInfluencerProfile: vi.fn(),
    } as never);

    await expect(
      updateCompanyProfileAsAdminAction(
        accountId,
        { status: "idle" },
        companyForm(),
      ),
    ).resolves.toEqual({
      message:
        "Este perfil mudou desde a abertura da página. Recarregue antes de tentar novamente.",
      profileVersion: 8,
      status: "error",
    });
  });

  it("does not leak authorization or persistence errors", async () => {
    mockedCreateService.mockRejectedValue(
      new Error("secret database credential and target email"),
    );

    const result = await updateCompanyProfileAsAdminAction(
      accountId,
      { status: "idle" },
      companyForm(),
    );

    expect(result).toEqual({
      message: "Não foi possível atualizar este perfil. Tente novamente.",
      status: "error",
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
