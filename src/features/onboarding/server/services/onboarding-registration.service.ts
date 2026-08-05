import "server-only";

import { runWithPostCommitEmailDelivery } from "@/features/communications/server";

import type {
  EmailRegistrationInput,
  GoogleProfileInput,
} from "../../schemas/onboarding-form-schema";

type OnboardingSubmissionResult =
  | { kind: "already_submitted" | "not_prepared" }
  | { kind: "submitted"; outboxId: string };

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
    | { kind: "account_exists" }
    | { kind: "failure" }
  >;
}

interface OnboardingRegistrationRepository {
  finalizePreparedRegistration(
    identityId: string,
  ): Promise<OnboardingSubmissionResult>;
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
  }): Promise<Extract<OnboardingSubmissionResult, { kind: "submitted" }>>;
}

interface OnboardingRegistrationConfiguration {
  callbackUrls: Record<"COMPANY" | "INFLUENCER", string>;
}

interface OnboardingRegistrationEmailDelivery {
  processOne(input: {
    outboxId: string;
    workerId: string;
  }): Promise<
    | { kind: "claim_lost" }
    | { kind: "dead_letter" }
    | { kind: "failed" }
    | { kind: "not_claimed" }
    | { kind: "sent" }
  >;
}

interface RegistrationAbuseProtection {
  consume(identity: string): Promise<{ allowed: boolean }>;
}

const REGISTRATION_FAILURE_MESSAGE =
  "Não foi possível concluir o cadastro agora. Nenhum cadastro parcial foi mantido.";
const ACCOUNT_EXISTS_MESSAGE =
  "Este e-mail já possui cadastro. Entre com sua senha ou recupere o acesso para continuar.";

export function createOnboardingRegistrationService(
  identity: RegistrationIdentityGateway,
  repository: OnboardingRegistrationRepository,
  configuration: OnboardingRegistrationConfiguration,
  emailDelivery?: OnboardingRegistrationEmailDelivery,
  abuseProtection?: RegistrationAbuseProtection,
) {
  async function submitWithImmediateEmail(
    commitBusinessEvent: () => Promise<OnboardingSubmissionResult>,
  ) {
    if (!emailDelivery) {
      return commitBusinessEvent();
    }

    const result = await runWithPostCommitEmailDelivery({
      commitBusinessEvent: async () => {
        const businessResult = await commitBusinessEvent();

        return {
          businessResult,
          outboxId:
            businessResult.kind === "submitted"
              ? businessResult.outboxId
              : null,
        };
      },
      processOne: (delivery) => emailDelivery.processOne(delivery),
      workerId: `onboarding:${crypto.randomUUID()}`,
    });

    return result.businessResult;
  }

  return {
    async finalizePreparedEmailRegistration(identityId: string) {
      const result = await submitWithImmediateEmail(() =>
        repository.finalizePreparedRegistration(identityId),
      );

      if (result.kind === "not_prepared") {
        return { kind: "not_prepared" as const };
      }

      return {
        destination: "/app/status/analysis",
        kind: "redirect" as const,
      };
    },

    async registerWithEmail(input: EmailRegistrationInput) {
      if (
        abuseProtection &&
        !(await abuseProtection.consume(input.email)).allowed
      ) {
        return {
          kind: "failure" as const,
          message:
            "Muitas tentativas foram realizadas. Aguarde antes de tentar novamente.",
        };
      }

      const identityResult = await identity.signUp({
        callbackUrl: configuration.callbackUrls[input.role],
        email: input.email,
        password: input.password,
      });

      if (identityResult.kind === "account_exists") {
        return {
          kind: "account_exists" as const,
          message: ACCOUNT_EXISTS_MESSAGE,
        };
      }

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
            "Seu perfil foi salvo. Confirme seu e-mail para enviar o cadastro para análise.",
        };
      }

      const submissionResult = await submitWithImmediateEmail(() =>
        repository.finalizePreparedRegistration(identityResult.identityId),
      );

      if (submissionResult.kind !== "not_prepared") {
        return {
          destination: "/app/status/analysis",
          kind: "redirect" as const,
        };
      }

      return {
        destination:
          input.role === "COMPANY"
            ? "/onboarding/company"
            : "/onboarding/influencer",
        kind: "redirect" as const,
      };
    },

    async submitGoogleProfile(input: {
      email: string;
      identityId: string;
      profile: GoogleProfileInput;
    }) {
      await submitWithImmediateEmail(() =>
        repository.submitGoogleProfile({
          email: input.email,
          identityId: input.identityId,
          input: input.profile,
          requestId: crypto.randomUUID(),
        }),
      );

      return {
        destination: "/app/status/analysis",
        kind: "redirect" as const,
      };
    },
  };
}

export type { OnboardingRegistrationRepository, RegistrationIdentityGateway };
