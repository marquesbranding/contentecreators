import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerCompanyProfileService } from "../services/server-company-profile.service";
import { updateCompanyProfileAction } from "./company-profile.actions";

vi.mock("../services/server-company-profile.service", () => ({
  createServerCompanyProfileService: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockedCreateService = vi.mocked(createServerCompanyProfileService);

function completeCompanyForm() {
  const formData = new FormData();
  const fields = {
    city: "São Paulo",
    cnpj: "12.345.678/0001-95",
    complement: "",
    description:
      "Empresa de tecnologia que busca creators para campanhas institucionais.",
    employeeRange: "51_TO_200",
    expectedVersion: "3",
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
    whatsapp: "(11) 99999-9999",
  };

  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  return formData;
}

describe("approved company profile action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid fields before persistence", async () => {
    const formData = completeCompanyForm();
    formData.set("tradeName", "");

    const result = await updateCompanyProfileAction(
      { status: "idle" },
      formData,
    );

    expect(result).toMatchObject({
      fieldErrors: { tradeName: expect.any(Array) },
      status: "error",
    });
    expect(mockedCreateService).not.toHaveBeenCalled();
  });

  it("returns only the published optimistic version", async () => {
    mockedCreateService.mockResolvedValue({
      loadOwnerProfile: vi.fn(),
      updateOwnerProfile: vi.fn().mockResolvedValue({
        kind: "updated",
        profile: {
          version: 4,
        },
      }),
    } as never);

    await expect(
      updateCompanyProfileAction({ status: "idle" }, completeCompanyForm()),
    ).resolves.toEqual({
      message: "Perfil da empresa atualizado com sucesso.",
      profileVersion: 4,
      status: "success",
    });
  });
});
