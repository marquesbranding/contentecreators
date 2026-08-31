import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import { createServerOnboardingRegistrationService } from "../services/server-onboarding-registration.service";
import { createServerCorrectedProfileResubmissionService } from "../services/server-corrected-profile-resubmission.service";
import {
  registerWithEmailAction,
  submitGoogleProfileAction,
} from "./onboarding.actions";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/shared/server/supabase/server-client", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("../services/server-onboarding-registration.service", () => ({
  createServerOnboardingRegistrationService: vi.fn(),
}));
vi.mock("../services/server-corrected-profile-resubmission.service", () => ({
  createServerCorrectedProfileResubmissionService: vi.fn(),
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);
const mockedCreateRegistrationService = vi.mocked(
  createServerOnboardingRegistrationService,
);
const mockedCreateCorrectionService = vi.mocked(
  createServerCorrectedProfileResubmissionService,
);

function completeCreatorProfile() {
  const formData = new FormData();
  const fields = {
    avatarAssetId: "79000000-0000-4000-8000-000000000031",
    bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
    city: "São Paulo",
    coverAssetId: "79000000-0000-4000-8000-000000000032",
    creatorType: "INFLUENCER",
    displayName: "Joana Cria",
    followers: "12500",
    legalName: "Joana da Silva",
    privacyAccepted: "on",
    role: "INFLUENCER",
    "socialChannels.INSTAGRAM.selected": "on",
    "socialChannels.INSTAGRAM.url": "https://instagram.com/joanacria",
    state: "SP",
    termsAccepted: "on",
    whatsapp: "(11) 99999-9999",
  };

  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  formData.append("nicheSlugs", "tecnologia-games-e-inovacao");

  return formData;
}

function completeCompanyRegistration() {
  const formData = new FormData();
  const fields = {
    city: "São Paulo",
    cnpj: "11.222.333/0001-81",
    complement: "",
    description:
      "Empresa de tecnologia que busca creators para campanhas institucionais.",
    email: "empresa@example.com",
    employeeRange: "11_TO_50",
    legalName: "Empresa Exemplo Ltda.",
    neighborhood: "Centro",
    number: "100",
    password: "StrongPass1",
    passwordConfirmation: "StrongPass1",
    postalCode: "01001-000",
    privacyAccepted: "on",
    role: "COMPANY",
    segment: "Tecnologia",
    socialPlatform: "LINKEDIN",
    socialUrl: "HTTPS://LinkedIn.COM:443/company/empresa-exemplo/#sobre",
    state: "SP",
    street: "Praça da Sé",
    termsAccepted: "on",
    tradeName: "Empresa Exemplo",
    websiteUrl: "https://empresa.example",
    whatsapp: "(11) 99999-9999",
  };

  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  const additionalLocation = {
    city: "Curitiba",
    complement: "",
    label: "Filial Sul",
    neighborhood: "Centro",
    number: "120",
    postalCode: "80010-000",
    state: "PR",
    street: "Rua das Flores",
  };
  Object.entries(additionalLocation).forEach(([name, value]) => {
    formData.set(`additionalLocations.branch-south.${name}`, value);
  });
  return formData;
}

describe("onboarding actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              email: "joana@example.com",
              id: "91000000-0000-4000-8000-000000000010",
            },
          },
        }),
      },
    } as never);
  });

  it("does not swallow Next.js redirect after Google profile submission", async () => {
    const redirectSignal = new Error("NEXT_REDIRECT");
    const submitGoogleProfile = vi.fn().mockResolvedValue({
      destination: "/app/status/analysis",
    });
    mockedCreateRegistrationService.mockResolvedValue({
      finalizePreparedEmailRegistration: vi.fn(),
      registerWithEmail: vi.fn(),
      submitGoogleProfile,
    });
    redirect.mockImplementation(() => {
      throw redirectSignal;
    });

    await expect(
      submitGoogleProfileAction({ status: "idle" }, completeCreatorProfile()),
    ).rejects.toBe(redirectSignal);

    expect(submitGoogleProfile).toHaveBeenCalledWith({
      email: "joana@example.com",
      identityId: "91000000-0000-4000-8000-000000000010",
      profile: expect.objectContaining({
        avatarAssetId: "79000000-0000-4000-8000-000000000031",
        coverAssetId: "79000000-0000-4000-8000-000000000032",
        role: "INFLUENCER",
      }),
    });
    expect(redirect).toHaveBeenCalledWith("/app/status/analysis");
  });

  it("resubmits a corrected profile with stable idempotency and expected versions", async () => {
    const redirectSignal = new Error("NEXT_REDIRECT");
    const resubmit = vi.fn().mockResolvedValue({ kind: "submitted" });
    mockedCreateCorrectionService.mockResolvedValue({ resubmit });
    redirect.mockImplementation(() => {
      throw redirectSignal;
    });
    const formData = completeCreatorProfile();
    formData.set("expectedAccountVersion", "3");
    formData.set("expectedProfileVersion", "5");
    formData.set(
      "resubmissionIdempotencyKey",
      "99000000-0000-4000-8000-000000000001",
    );

    await expect(
      submitGoogleProfileAction({ status: "idle" }, formData),
    ).rejects.toBe(redirectSignal);

    expect(resubmit).toHaveBeenCalledWith({
      command: {
        expectedAccountVersion: 3,
        expectedProfileVersion: 5,
        idempotencyKey: "99000000-0000-4000-8000-000000000001",
      },
      profile: expect.objectContaining({
        role: "INFLUENCER",
      }),
      requestId: expect.any(String),
    });
    expect(mockedCreateRegistrationService).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/app/status/analysis");
  });

  it("never echoes credentials or private profile fields in an Action validation DTO", async () => {
    const formData = completeCreatorProfile();
    formData.set("email", "joana@example.com");
    formData.set("password", "raw-password");
    formData.set("passwordConfirmation", "different-password");

    const result = await registerWithEmailAction({ status: "idle" }, formData);
    const serializedResult = JSON.stringify(result);

    expect(result).toMatchObject({
      status: "error",
      values: {
        email: "joana@example.com",
        role: "INFLUENCER",
      },
    });
    expect(serializedResult).not.toContain("raw-password");
    expect(serializedResult).not.toContain("different-password");
    expect(serializedResult).not.toContain("(11) 99999-9999");
    expect(serializedResult).not.toContain(
      "Crio conteúdo de tecnologia e produtividade para a internet.",
    );
    expect(serializedResult).not.toContain("https://instagram.com/joanacria");
  });

  it("returns account-exists guidance without exposing private fields", async () => {
    const registerWithEmail = vi.fn().mockResolvedValue({
      kind: "account_exists",
      message:
        "Este e-mail já possui cadastro. Entre com sua senha ou recupere o acesso para continuar.",
    });
    mockedCreateRegistrationService.mockResolvedValue({
      finalizePreparedEmailRegistration: vi.fn(),
      registerWithEmail,
      submitGoogleProfile: vi.fn(),
    });

    const result = await registerWithEmailAction(
      { status: "idle" },
      completeCompanyRegistration(),
    );
    const serializedResult = JSON.stringify(result);

    expect(result).toMatchObject({
      errorCode: "account_already_exists",
      message:
        "Este e-mail já possui cadastro. Entre com sua senha ou recupere o acesso para continuar.",
      status: "error",
      values: {
        email: "empresa@example.com",
        role: "COMPANY",
      },
    });
    expect(serializedResult).not.toContain("StrongPass1");
    expect(serializedResult).not.toContain("11.222.333/0001-81");
    expect(serializedResult).not.toContain("(11) 99999-9999");
  });

  it("validates and canonicalizes optional company social data before registration", async () => {
    const registerWithEmail = vi.fn().mockResolvedValue({
      kind: "confirmation_required",
      message: "Confirme seu e-mail.",
    });
    mockedCreateRegistrationService.mockResolvedValue({
      finalizePreparedEmailRegistration: vi.fn(),
      registerWithEmail,
      submitGoogleProfile: vi.fn(),
    });

    await registerWithEmailAction(
      { status: "idle" },
      completeCompanyRegistration(),
    );

    expect(registerWithEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "COMPANY",
        additionalLocations: [
          expect.objectContaining({
            city: "Curitiba",
            label: "Filial Sul",
          }),
        ],
        socialPlatform: "LINKEDIN",
        socialUrl: "https://linkedin.com/company/empresa-exemplo",
      }),
      /* Media files travel as a second argument since signup started
       * accepting a logo and a cover. */
      expect.objectContaining({
        avatarFile: null,
        coverFile: null,
        logoFile: null,
      }),
    );
  });
});
