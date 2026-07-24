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
      callbackUrl:
        "http://localhost:3000/auth/callback?next=/app/status/analysis",
    });

    const result = await service.registerWithEmail(influencerInput);

    expect(identity.signUp).toHaveBeenCalledWith({
      callbackUrl:
        "http://localhost:3000/auth/callback?next=/app/status/analysis",
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
      callbackUrl:
        "http://localhost:3000/auth/callback?next=/app/status/analysis",
    });

    const result = await service.registerWithEmail(influencerInput);

    expect(identity.deleteIdentity).toHaveBeenCalledWith("identity-2");
    expect(result).toEqual({
      kind: "failure",
      message:
        "Não foi possível concluir o cadastro agora. Nenhum cadastro parcial foi mantido.",
    });
  });

  it("finalizes immediately when local Auth returns an active session", async () => {
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
      }),
      prepareEmailRegistration: vi.fn().mockResolvedValue({
        accountId: "account-3",
      }),
      submitGoogleProfile: vi.fn(),
    };
    const service = createOnboardingRegistrationService(identity, repository, {
      callbackUrl:
        "http://localhost:3000/auth/callback?next=/app/status/analysis",
    });

    const result = await service.registerWithEmail(influencerInput);

    expect(repository.finalizePreparedRegistration).toHaveBeenCalledWith(
      "identity-3",
    );
    expect(result).toEqual({
      destination: "/app/status/analysis",
      kind: "redirect",
    });
  });
});
