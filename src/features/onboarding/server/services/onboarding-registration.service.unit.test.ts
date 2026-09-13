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
  legalName: "Joana da Silva",
  nicheSlugs: ["tecnologia-games-e-inovacao"],
  password: "StrongPass1",
  passwordConfirmation: "StrongPass1",
  privacyAccepted: true,
  role: "INFLUENCER",
  socialChannels: [
    {
      followerCount: 12_500,
      isPrimary: true,
      platform: "INSTAGRAM",
      url: "https://instagram.com/joanacria",
    },
  ],
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

  it("returns account guidance when the identity already exists", async () => {
    const identity = {
      deleteIdentity: vi.fn(),
      signUp: vi.fn().mockResolvedValue({ kind: "account_exists" }),
    };
    const repository = {
      finalizePreparedRegistration: vi.fn(),
      prepareEmailRegistration: vi.fn(),
      submitGoogleProfile: vi.fn(),
    };
    const service = createOnboardingRegistrationService(identity, repository, {
      callbackUrls: {
        COMPANY: "http://localhost:3000/auth/callback?next=/onboarding/company",
        INFLUENCER:
          "http://localhost:3000/auth/callback?next=/onboarding/influencer",
      },
    });

    await expect(service.registerWithEmail(influencerInput)).resolves.toEqual({
      kind: "account_exists",
      message:
        "Este e-mail já possui cadastro. Entre com sua senha ou recupere o acesso para continuar.",
    });
    expect(repository.prepareEmailRegistration).not.toHaveBeenCalled();
    expect(identity.deleteIdentity).not.toHaveBeenCalled();
  });

  it.each([
    [
      "weak_password",
      "A senha não atende aos requisitos de segurança. Use uma senha mais forte, com letras maiúsculas, minúsculas, números e símbolos.",
    ],
    [
      "rate_limited",
      "Muitas tentativas foram realizadas. Aguarde alguns minutos antes de tentar novamente.",
    ],
    [
      "invalid_email",
      "Não foi possível usar este e-mail. Confira o endereço informado ou use outro e-mail.",
    ],
    [
      "provider",
      "Não foi possível criar a conta. Confira os dados ou tente novamente.",
    ],
  ] as const)(
    "explains the %s Auth failure without persisting the profile",
    async (reason, message) => {
      const identity = {
        deleteIdentity: vi.fn(),
        signUp: vi
          .fn()
          .mockResolvedValue({ code: "auth_code", kind: "failure", reason }),
      };
      const repository = {
        finalizePreparedRegistration: vi.fn(),
        prepareEmailRegistration: vi.fn(),
        submitGoogleProfile: vi.fn(),
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
      );

      await expect(service.registerWithEmail(influencerInput)).resolves.toEqual(
        { kind: "failure", message },
      );
      expect(repository.prepareEmailRegistration).not.toHaveBeenCalled();
    },
  );

  it("prepares identity and profile in one application request", async () => {
    const identity = {
      deleteIdentity: vi.fn(),
      signUp: vi.fn().mockResolvedValue({
        confirmationEmailSent: true,
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

  it("saves the profile and points to resend when the confirmation email could not be sent", async () => {
    const identity = {
      deleteIdentity: vi.fn(),
      signUp: vi.fn().mockResolvedValue({
        confirmationEmailSent: false,
        confirmationRequired: true,
        identityId: "identity-smtp",
        kind: "success",
      }),
    };
    const repository = {
      finalizePreparedRegistration: vi.fn(),
      prepareEmailRegistration: vi.fn().mockResolvedValue({
        accountId: "account-smtp",
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

    await expect(service.registerWithEmail(influencerInput)).resolves.toEqual({
      kind: "confirmation_required",
      message:
        "Seu perfil foi salvo, mas não conseguimos enviar o e-mail de confirmação agora. Use “Reenviar confirmação” em alguns minutos.",
    });
    expect(repository.prepareEmailRegistration).toHaveBeenCalled();
    expect(identity.deleteIdentity).not.toHaveBeenCalled();
  });

  it("reports a duplicate CNPJ and removes the partial Auth identity", async () => {
    const identity = {
      deleteIdentity: vi.fn().mockResolvedValue(undefined),
      signUp: vi.fn().mockResolvedValue({
        confirmationEmailSent: true,
        confirmationRequired: true,
        identityId: "identity-cnpj",
        kind: "success",
      }),
    };
    const repository = {
      finalizePreparedRegistration: vi.fn(),
      prepareEmailRegistration: vi.fn().mockRejectedValue(
        Object.assign(new Error("Failed query"), {
          cause: {
            code: "23505",
            constraint_name: "company_profiles_cnpj_uidx",
          },
        }),
      ),
      submitGoogleProfile: vi.fn(),
    };
    const service = createOnboardingRegistrationService(identity, repository, {
      callbackUrls: {
        COMPANY: "http://localhost:3000/auth/callback?next=/onboarding/company",
        INFLUENCER:
          "http://localhost:3000/auth/callback?next=/onboarding/influencer",
      },
    });

    await expect(service.registerWithEmail(influencerInput)).resolves.toEqual({
      kind: "duplicate_cnpj",
      message: "Este CNPJ já está cadastrado.",
    });
    expect(identity.deleteIdentity).toHaveBeenCalledWith("identity-cnpj");
  });

  it("removes a partial Auth identity when profile persistence fails", async () => {
    const identity = {
      deleteIdentity: vi.fn().mockResolvedValue(undefined),
      signUp: vi.fn().mockResolvedValue({
        confirmationEmailSent: true,
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

  it("submits the saved profile for analysis when Auth returns an active session", async () => {
    const identity = {
      deleteIdentity: vi.fn(),
      signUp: vi.fn().mockResolvedValue({
        confirmationEmailSent: true,
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

    expect(repository.finalizePreparedRegistration).toHaveBeenCalledWith(
      "identity-3",
    );
    expect(processOne).toHaveBeenCalledWith({
      outboxId: "e0000000-0000-4000-8000-000000000001",
      workerId: expect.stringMatching(/^onboarding:/u),
    });
    expect(result).toEqual({
      destination: "/app/status/analysis",
      kind: "redirect",
    });
  });

  it("submits a prepared email registration after the confirmation callback", async () => {
    const identity = {
      deleteIdentity: vi.fn(),
      signUp: vi.fn(),
    };
    const repository = {
      finalizePreparedRegistration: vi.fn().mockResolvedValue({
        kind: "submitted",
        outboxId: "e0000000-0000-4000-8000-000000000002",
      }),
      prepareEmailRegistration: vi.fn(),
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

    await expect(
      service.finalizePreparedEmailRegistration("identity-4"),
    ).resolves.toEqual({
      destination: "/app/status/analysis",
      kind: "redirect",
    });
    expect(repository.finalizePreparedRegistration).toHaveBeenCalledWith(
      "identity-4",
    );
    expect(processOne).toHaveBeenCalledWith({
      outboxId: "e0000000-0000-4000-8000-000000000002",
      workerId: expect.stringMatching(/^onboarding:/u),
    });
  });
});
