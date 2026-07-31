import { describe, expect, it, vi } from "vitest";

import type { EmailRegistrationInput } from "../../schemas/onboarding-form-schema";
import { createOnboardingRegistrationService } from "./onboarding-registration.service";

const influencerInput = {
  bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
  city: "São Paulo",
  contactVisibilityAccepted: false,
  creatorType: "INFLUENCER",
  displayName: "Joana Cria",
  email: "joana@example.com",
  engagementRate: 4.25,
  followers: 12_500,
  legalName: "Joana da Silva",
  nicheSlugs: ["tecnologia"],
  password: "StrongPass1",
  passwordConfirmation: "StrongPass1",
  privacyAccepted: true,
  role: "INFLUENCER",
  socialPlatform: "INSTAGRAM",
  socialUrl: "https://instagram.com/joanacria",
  state: "SP",
  termsAccepted: true,
  whatsapp: "(11) 99999-9999",
} satisfies EmailRegistrationInput;

describe("onboarding registration service", () => {
  it("rate limits the combined registration before creating an Auth identity", async () => {
    const identity = {
      deleteIdentity: vi.fn(),
      signUp: vi.fn(),
    };
    const repository = {
      finalizePreparedRegistration: vi.fn(),
      prepareEmailRegistration: vi.fn(),
      submitGoogleProfile: vi.fn(),
    };
    const abuseProtection = {
      consume: vi.fn().mockResolvedValue({ allowed: false }),
    };
    const service = createOnboardingRegistrationService(
      identity,
      repository,
      {
        callbackUrls: {
          COMPANY:
            "http://localhost:3000/auth/callback?next=/onboarding/company",
          INFLUENCER:
            "http://localhost:3000/auth/callback?next=/onboarding/influencer",
        },
      },
      undefined,
      abuseProtection,
    );

    await expect(service.registerWithEmail(influencerInput)).resolves.toEqual({
      kind: "failure",
      message:
        "Muitas tentativas foram realizadas. Aguarde antes de tentar novamente.",
    });
    expect(abuseProtection.consume).toHaveBeenCalledWith("joana@example.com");
    expect(identity.signUp).not.toHaveBeenCalled();
  });

  it("prepares identity and profile in one application request", async () => {
    const identity = {
      deleteIdentity: vi.fn(),
      signUp: vi.fn().mockResolvedValue({
        confirmationRequired: true,
        identityId: "identity-1",
        kind: "success",
      }),
    };
    const repository = {
      finalizePreparedRegistration: vi.fn(),
      prepareEmailRegistration: vi.fn().mockResolvedValue({
        accountId: "account-1",
      }),
      submitGoogleProfile: vi.fn(),
    };
    const service = createOnboardingRegistrationService(identity, repository, {
      callbackUrls: {
        COMPANY: "http://localhost:3000/auth/callback?next=/onboarding/company",
        INFLUENCER:
          "http://localhost:3000/auth/callback?next=/onboarding/influencer",
      },
    });

    const result = await service.registerWithEmail(influencerInput);

    expect(identity.signUp).toHaveBeenCalledWith({
      callbackUrl:
        "http://localhost:3000/auth/callback?next=/onboarding/influencer",
      email: "joana@example.com",
      password: "StrongPass1",
    });
    expect(repository.prepareEmailRegistration).toHaveBeenCalledWith({
      identityId: "identity-1",
      input: influencerInput,
      requestId: expect.any(String),
    });
    expect(result.kind).toBe("confirmation_required");
  });

  it("removes a partial Auth identity when profile persistence fails", async () => {
    const identity = {
      deleteIdentity: vi.fn().mockResolvedValue(undefined),
      signUp: vi.fn().mockResolvedValue({
        confirmationRequired: true,
        identityId: "identity-2",
        kind: "success",
      }),
    };
    const repository = {
      finalizePreparedRegistration: vi.fn(),
      prepareEmailRegistration: vi
        .fn()
        .mockRejectedValue(new Error("database unavailable")),
      submitGoogleProfile: vi.fn(),
    };
    const service = createOnboardingRegistrationService(identity, repository, {
      callbackUrls: {
        COMPANY: "http://localhost:3000/auth/callback?next=/onboarding/company",
        INFLUENCER:
          "http://localhost:3000/auth/callback?next=/onboarding/influencer",
      },
    });

    const result = await service.registerWithEmail(influencerInput);

    expect(identity.deleteIdentity).toHaveBeenCalledWith("identity-2");
    expect(result).toEqual({
      kind: "failure",
      message:
        "Não foi possível concluir o cadastro agora. Nenhum cadastro parcial foi mantido.",
    });
  });

  it("opens the saved profile for review when Auth returns an active session", async () => {
    const identity = {
      deleteIdentity: vi.fn(),
      signUp: vi.fn().mockResolvedValue({
        confirmationRequired: false,
        identityId: "identity-3",
        kind: "success",
      }),
    };
    const repository = {
      finalizePreparedRegistration: vi.fn().mockResolvedValue({
        kind: "submitted",
        outboxId: "e0000000-0000-4000-8000-000000000001",
      }),
      prepareEmailRegistration: vi.fn().mockResolvedValue({
        accountId: "account-3",
      }),
      submitGoogleProfile: vi.fn(),
    };
    const processOne = vi.fn().mockResolvedValue({ kind: "sent" as const });
    const service = createOnboardingRegistrationService(
      identity,
      repository,
      {
        callbackUrls: {
          COMPANY:
            "http://localhost:3000/auth/callback?next=/onboarding/company",
          INFLUENCER:
            "http://localhost:3000/auth/callback?next=/onboarding/influencer",
        },
      },
      { processOne },
    );

    const result = await service.registerWithEmail(influencerInput);

    expect(repository.finalizePreparedRegistration).not.toHaveBeenCalled();
    expect(processOne).not.toHaveBeenCalled();
    expect(result).toEqual({
      destination: "/onboarding/influencer",
      kind: "redirect",
    });
  });
});
