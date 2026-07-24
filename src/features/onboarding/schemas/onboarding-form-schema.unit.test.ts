import { describe, expect, it } from "vitest";

import {
  emailRegistrationSchema,
  googleProfileSchema,
} from "./onboarding-form-schema";

const commonProfile = {
  city: "São Paulo",
  legalName: "Joana da Silva",
  privacyAccepted: "on",
  state: "sp",
  termsAccepted: "on",
  whatsapp: "(11) 99999-9999",
};

describe("onboarding form contracts", () => {
  it("accepts one complete influencer registration payload", () => {
    const result = emailRegistrationSchema.safeParse({
      ...commonProfile,
      bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
      creatorType: "INFLUENCER",
      displayName: "Joana Cria",
      email: "JOANA@EXAMPLE.COM",
      engagementRate: "4.25",
      followers: "12500",
      nicheSlugs: ["tecnologia"],
      password: "StrongPass1",
      passwordConfirmation: "StrongPass1",
      role: "INFLUENCER",
      socialPlatform: "INSTAGRAM",
      socialUrl: "https://instagram.com/joanacria",
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.role === "INFLUENCER") {
      expect(result.data.email).toBe("joana@example.com");
      expect(result.data.state).toBe("SP");
      expect(result.data.role).toBe("INFLUENCER");
      expect(result.data.contactVisibilityAccepted).toBe(false);
    }
  });

  it("records creator contact visibility only after an explicit opt-in", () => {
    const result = emailRegistrationSchema.safeParse({
      ...commonProfile,
      bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
      contactVisibilityAccepted: "on",
      creatorType: "INFLUENCER",
      displayName: "Joana Cria",
      email: "joana@example.com",
      engagementRate: "4.25",
      followers: "12500",
      nicheSlugs: ["tecnologia"],
      password: "StrongPass1",
      passwordConfirmation: "StrongPass1",
      role: "INFLUENCER",
      socialPlatform: "INSTAGRAM",
      socialUrl: "https://instagram.com/joanacria",
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.role === "INFLUENCER") {
      expect(result.data.contactVisibilityAccepted).toBe(true);
    }
  });

  it("accepts one complete company registration payload", () => {
    const result = emailRegistrationSchema.safeParse({
      ...commonProfile,
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
      cnpj: "11.222.333/0001-81",
      coverAssetId: "79000000-0000-4000-8000-000000000052",
      description:
        "Empresa de tecnologia que busca creators para campanhas institucionais.",
      email: "empresa@example.com",
      employeeRange: "11_TO_50",
      logoAssetId: "79000000-0000-4000-8000-000000000051",
      neighborhood: "Centro",
      number: "100",
      password: "StrongPass1",
      passwordConfirmation: "StrongPass1",
      postalCode: "01001-000",
      role: "COMPANY",
      segment: "Tecnologia",
      socialPlatform: "LINKEDIN",
      socialUrl: " HTTPS://LinkedIn.COM:443/company/empresa-exemplo/#sobre ",
      street: "Praça da Sé",
      tradeName: "Empresa Exemplo",
      websiteUrl: "https://example.com",
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.role === "COMPANY") {
      expect(result.data.cnpj).toBe("11222333000181");
      expect(result.data.role).toBe("COMPANY");
      expect(result.data.socialUrl).toBe(
        "https://linkedin.com/company/empresa-exemplo",
      );
      expect(result.data.additionalLocations).toEqual([
        expect.objectContaining({
          city: "Curitiba",
          label: "Filial Sul",
          postalCode: "80010000",
          state: "PR",
        }),
      ]);
      expect(result.data.logoAssetId).toBe(
        "79000000-0000-4000-8000-000000000051",
      );
      expect(result.data.coverAssetId).toBe(
        "79000000-0000-4000-8000-000000000052",
      );
    }
  });

  it.each([
    { socialPlatform: "LINKEDIN", socialUrl: undefined },
    {
      socialPlatform: undefined,
      socialUrl: "https://linkedin.com/company/empresa-exemplo",
    },
  ])(
    "requires company social platform and URL to be supplied together %#",
    (social) => {
      const result = emailRegistrationSchema.safeParse({
        ...commonProfile,
        cnpj: "11.222.333/0001-81",
        description:
          "Empresa de tecnologia que busca creators para campanhas institucionais.",
        email: "empresa@example.com",
        employeeRange: "11_TO_50",
        neighborhood: "Centro",
        number: "100",
        password: "StrongPass1",
        passwordConfirmation: "StrongPass1",
        postalCode: "01001-000",
        role: "COMPANY",
        segment: "Tecnologia",
        street: "Praça da Sé",
        tradeName: "Empresa Exemplo",
        websiteUrl: "https://example.com",
        ...social,
      });

      expect(result.success).toBe(false);
    },
  );

  it("rejects mismatched passwords, public admin, and invalid consent", () => {
    const result = emailRegistrationSchema.safeParse({
      email: "person@example.com",
      password: "StrongPass1",
      passwordConfirmation: "Different1",
      privacyAccepted: "",
      role: "ADMIN",
      termsAccepted: "",
    });

    expect(result.success).toBe(false);
  });

  it("requires the Google profile shape selected by the trusted account role", () => {
    const result = googleProfileSchema.safeParse({
      ...commonProfile,
      role: "COMPANY",
    });

    expect(result.success).toBe(false);
  });

  it("accepts owned media identifiers for transactional creator activation", () => {
    const result = googleProfileSchema.safeParse({
      ...commonProfile,
      avatarAssetId: "79000000-0000-4000-8000-000000000001",
      bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
      coverAssetId: "79000000-0000-4000-8000-000000000002",
      creatorType: "INFLUENCER",
      displayName: "Joana Cria",
      engagementRate: "4.25",
      followers: "12500",
      nicheSlugs: ["tecnologia"],
      role: "INFLUENCER",
      socialPlatform: "INSTAGRAM",
      socialUrl: "https://instagram.com/joanacria",
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.role === "INFLUENCER") {
      expect(result.data.avatarAssetId).toBe(
        "79000000-0000-4000-8000-000000000001",
      );
      expect(result.data.coverAssetId).toBe(
        "79000000-0000-4000-8000-000000000002",
      );
    }
  });

  it("rejects malformed creator media identifiers", () => {
    const result = googleProfileSchema.safeParse({
      ...commonProfile,
      avatarAssetId: "not-an-asset-id",
      bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
      creatorType: "INFLUENCER",
      displayName: "Joana Cria",
      engagementRate: "4.25",
      followers: "12500",
      nicheSlugs: ["tecnologia"],
      role: "INFLUENCER",
      socialPlatform: "INSTAGRAM",
      socialUrl: "https://instagram.com/joanacria",
    });

    expect(result.success).toBe(false);
  });
});
