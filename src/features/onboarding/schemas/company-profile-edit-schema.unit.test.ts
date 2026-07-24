import { describe, expect, it } from "vitest";

import { companyProfileEditSchema } from "./company-profile-edit-schema";

const completeEdit = {
  additionalLocations: [
    {
      city: "Curitiba",
      complement: "",
      label: "Filial Sul",
      neighborhood: "Centro",
      number: "120",
      postalCode: "80010-000",
      state: "pr",
      street: "Rua das Flores",
    },
  ],
  city: "São Paulo",
  cnpj: "11.222.333/0001-81",
  complement: "",
  description:
    "Empresa de tecnologia que busca creators para campanhas institucionais.",
  employeeRange: "11_TO_50",
  expectedVersion: "3",
  legalName: "Empresa Exemplo Ltda.",
  neighborhood: "Centro",
  number: "100",
  postalCode: "01001-000",
  segment: "Tecnologia",
  socialPlatform: "LINKEDIN",
  socialUrl: "HTTPS://LinkedIn.COM:443/company/empresa-exemplo/#sobre",
  state: "sp",
  street: "Praça da Sé",
  tradeName: "Empresa Exemplo",
  websiteUrl: "https://empresa.example",
  whatsapp: "(11) 99999-9999",
};

describe("company profile edit schema", () => {
  it("normalizes company, location, social and version fields", () => {
    const result = companyProfileEditSchema.safeParse(completeEdit);

    expect(result).toMatchObject({
      data: {
        additionalLocations: [
          {
            postalCode: "80010000",
            state: "PR",
          },
        ],
        cnpj: "11222333000181",
        expectedVersion: 3,
        socialUrl: "https://linkedin.com/company/empresa-exemplo",
        state: "SP",
      },
      success: true,
    });
  });

  it("rejects invalid CNPJ, incomplete social pair and stale-shaped version", () => {
    const result = companyProfileEditSchema.safeParse({
      ...completeEdit,
      cnpj: "00.000.000/0000-00",
      expectedVersion: "0",
      socialPlatform: undefined,
    });

    expect(result.success).toBe(false);
  });
});
