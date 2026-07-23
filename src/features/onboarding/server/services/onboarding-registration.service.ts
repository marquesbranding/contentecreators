import "server-only";

import type {
  EmailRegistrationInput,
  GoogleProfileInput,
} from "../../schemas/onboarding-form-schema";

interface RegistrationIdentityGateway {
  deleteIdentity(identityId: string): Promise<void>;
  signUp(input: {
    callbackUrl: string;
    email: string;
    password: string;
  }): Promise<
    | {
        confirmationRequired: boolean;
        identityId: string;
        kind: "success";
      }
    | { kind: "failure" }
  >;
}

interface OnboardingRegistrationRepository {
  finalizePreparedRegistration(
    identityId: string,
  ): Promise<{ kind: "already_submitted" | "not_prepared" | "submitted" }>;
  prepareEmailRegistration(input: {
    identityId: string;
    input: EmailRegistrationInput;
    requestId: string;
  }): Promise<{ accountId: string }>;
  submitGoogleProfile(input: {
    email: string;
    identityId: string;
    input: GoogleProfileInput;
    requestId: string;
  }): Promise<{ kind: "submitted" }>;
}

interface OnboardingRegistrationConfiguration {
  callbackUrl: string;
}

const REGISTRATION_FAILURE_MESSAGE =
  "Não foi possível concluir o cadastro agora. Nenhum cadastro parcial foi mantido.";

export function createOnboardingRegistrationService(
  identity: RegistrationIdentityGateway,
  repository: OnboardingRegistrationRepository,
  configuration: OnboardingRegistrationConfiguration,
) {
  return {
    async registerWithEmail(input: EmailRegistrationInput) {
      const identityResult = await identity.signUp({
        callbackUrl: configuration.callbackUrl,
        email: input.email,
        password: input.password,
      });

      if (identityResult.kind === "failure") {
        return {
          kind: "failure" as const,
          message:
            "Não foi possível criar a conta. Confira os dados ou tente novamente.",
        };
      }

      try {
        await repository.prepareEmailRegistration({
          identityId: identityResult.identityId,
          input,
          requestId: crypto.randomUUID(),
        });
      } catch {
        await identity.deleteIdentity(identityResult.identityId);

        return {
          kind: "failure" as const,
          message: REGISTRATION_FAILURE_MESSAGE,
        };
      }

      if (identityResult.confirmationRequired) {
        return {
          kind: "confirmation_required" as const,
          message:
            "Seu perfil foi salvo. Confirme seu e-mail para enviá-lo à análise.",
        };
      }

      await repository.finalizePreparedRegistration(identityResult.identityId);

      return {
        destination: "/app/status/analysis",
        kind: "redirect" as const,
      };
    },

    async submitGoogleProfile(input: {
      email: string;
      identityId: string;
      profile: GoogleProfileInput;
    }) {
      await repository.submitGoogleProfile({
        email: input.email,
        identityId: input.identityId,
        input: input.profile,
        requestId: crypto.randomUUID(),
      });

      return {
        destination: "/app/status/analysis",
        kind: "redirect" as const,
      };
    },

    async finalizePreparedRegistration(identityId: string) {
      return repository.finalizePreparedRegistration(identityId);
    },
  };
}

export type { OnboardingRegistrationRepository, RegistrationIdentityGateway };
