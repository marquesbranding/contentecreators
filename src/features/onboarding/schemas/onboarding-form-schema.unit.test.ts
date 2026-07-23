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
    if (result.success) {
      expect(result.data.email).toBe("joana@example.com");
      expect(result.data.state).toBe("SP");
      expect(result.data.role).toBe("INFLUENCER");
    }
  });

  it("accepts one complete company registration payload", () => {
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
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.role === "COMPANY") {
      expect(result.data.cnpj).toBe("11222333000181");
      expect(result.data.role).toBe("COMPANY");
    }
  });

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
});
