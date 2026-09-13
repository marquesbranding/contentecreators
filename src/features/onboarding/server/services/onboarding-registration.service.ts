import "server-only";

import { runWithPostCommitEmailDelivery } from "@/features/communications/server";
import { operationalLogger } from "@/shared/server/observability/operational-logger";

import type {
  EmailRegistrationInput,
  GoogleProfileInput,
} from "../../schemas/onboarding-form-schema";
import { isUniqueViolation } from "./unique-violation";

type OnboardingSubmissionResult =
  | { kind: "already_submitted" | "not_prepared" }
  | { kind: "submitted"; outboxId: string };

export interface RegistrationMediaFiles {
  avatarFile?: File | null;
  coverFile?: File | null;
  logoFile?: File | null;
}

type RegistrationIdentityFailureReason =
  "invalid_email" | "provider" | "rate_limited" | "weak_password";

const IDENTITY_FAILURE_MESSAGES: Record<
  RegistrationIdentityFailureReason,
  string
> = {
  invalid_email:
    "Não foi possível usar este e-mail. Confira o endereço informado ou use outro e-mail.",
  provider:
    "Não foi possível criar a conta. Confira os dados ou tente novamente.",
  rate_limited:
    "Muitas tentativas foram realizadas. Aguarde alguns minutos antes de tentar novamente.",
  weak_password:
    "A senha não atende aos requisitos de segurança. Use uma senha mais forte, com letras maiúsculas, minúsculas, números e símbolos.",
};

interface RegistrationIdentityGateway {
  deleteIdentity(identityId: string): Promise<void>;
  signUp(input: {
    callbackUrl: string;
    email: string;
    password: string;
  }): Promise<
    | {
        confirmationEmailSent: boolean;
        confirmationRequired: boolean;
        identityId: string;
        kind: "success";
      }
    | { kind: "account_exists" }
    | {
        code: string;
        kind: "failure";
        reason: RegistrationIdentityFailureReason;
      }
  >;
}

interface OnboardingRegistrationRepository {
  finalizePreparedRegistration(
    identityId: string,
  ): Promise<OnboardingSubmissionResult>;
  prepareEmailRegistration(input: {
    identityId: string;
    input: EmailRegistrationInput;
    media?: RegistrationMediaFiles;
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

    async registerWithEmail(
      input: EmailRegistrationInput,
      media?: RegistrationMediaFiles,
    ) {
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
          message: IDENTITY_FAILURE_MESSAGES[identityResult.reason],
        };
      }

      try {
        await repository.prepareEmailRegistration({
          identityId: identityResult.identityId,
          input,
          media,
          requestId: crypto.randomUUID(),
        });
      } catch (error) {
        await identity.deleteIdentity(identityResult.identityId);

        if (isUniqueViolation(error, "company_profiles_cnpj_uidx")) {
          return {
            kind: "duplicate_cnpj" as const,
            message: "Este CNPJ já está cadastrado.",
          };
        }

        operationalLogger.error({
          details: {
            errorMessage:
              error instanceof Error ? error.message : String(error),
            role: input.role,
          },
          event: "onboarding_submission_failure",
          operation: "prepare_email_registration",
          outcome: "error",
          requestId: crypto.randomUUID(),
        });

        return {
          kind: "failure" as const,
          message: REGISTRATION_FAILURE_MESSAGE,
        };
      }

      if (identityResult.confirmationRequired) {
        return {
          kind: "confirmation_required" as const,
          message: identityResult.confirmationEmailSent
            ? "Seu perfil foi salvo. Confirme seu e-mail para enviar o cadastro para análise."
            : "Seu perfil foi salvo, mas não conseguimos enviar o e-mail de confirmação agora. Use “Reenviar confirmação” em alguns minutos.",
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

export type {
  OnboardingRegistrationRepository,
  RegistrationIdentityFailureReason,
  RegistrationIdentityGateway,
};
