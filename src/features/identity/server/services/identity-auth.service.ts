import "server-only";

import {
  buildAuthCallbackUrl,
  sanitizeAuthReturnPath,
} from "../../domain/auth-return-path";
import { buildRoleSelectionPath } from "../../domain/registration-intent";
import type {
  LoginInput,
  ResetPasswordInput,
  SignUpInput,
} from "../../schemas/auth-form-schemas";
import type { RegistrationIntent } from "../../types/auth.types";

type GatewaySuccess<T extends object = Record<never, never>> = {
  kind: "success";
} & T;

type GatewayFailure = {
  code: string;
  kind: "failure";
};

type GatewayResult<T extends object = Record<never, never>> =
  GatewaySuccess<T> | GatewayFailure;

export interface CurrentIdentity {
  email: string;
  id: string;
  emailConfirmedAt: string | null;
  emailVerifiedByProvider: boolean;
}

export interface IdentityAuthGateway {
  beginGoogleSignIn(input: {
    redirectTo: string;
  }): Promise<GatewayResult<{ url: string }>>;
  exchangeCodeForSession(code: string): Promise<GatewayResult>;
  getCurrentIdentity(): Promise<CurrentIdentity | null>;
  requestPasswordRecovery(input: {
    email: string;
    redirectTo: string;
  }): Promise<GatewayResult>;
  resendConfirmation(input: {
    email: string;
    emailRedirectTo: string;
  }): Promise<GatewayResult>;
  signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<GatewayResult>;
  signOut(): Promise<GatewayResult>;
  signUpWithPassword(input: {
    email: string;
    emailRedirectTo: string;
    password: string;
  }): Promise<GatewayResult<{ confirmationRequired: boolean }>>;
  updatePassword(password: string): Promise<GatewayResult>;
}

export const AUTH_MESSAGES = {
  confirmationRequired:
    "Cadastro iniciado. Confira sua caixa de entrada para confirmar o e-mail.",
  confirmationResent:
    "Se o cadastro estiver aguardando confirmação, enviaremos uma nova mensagem.",
  emailNotConfirmed:
    "Confirme seu e-mail antes de enviar o perfil para análise.",
  invalidCallback:
    "Não foi possível validar este acesso. Inicie o processo novamente.",
  invalidCredentials:
    "Não foi possível entrar. Confira os dados informados ou recupere sua senha.",
  passwordUpdated:
    "Senha atualizada. Agora você já pode entrar com a nova senha.",
  providerUnavailable:
    "Não foi possível concluir agora. Tente novamente em instantes.",
  recoveryRequested:
    "Se houver uma conta para este e-mail, enviaremos as instruções de recuperação.",
  recoveryUnavailable:
    "Este link expirou, já foi utilizado ou não pertence a uma sessão válida.",
} as const;

interface IdentityAuthServiceConfiguration {
  appUrl: string;
}

export function createIdentityAuthService(
  gateway: IdentityAuthGateway,
  configuration: IdentityAuthServiceConfiguration,
) {
  return {
    async signIn(input: LoginInput) {
      const result = await gateway.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (result.kind === "failure") {
        return {
          kind: "failure" as const,
          message: AUTH_MESSAGES.invalidCredentials,
        };
      }

      return {
        destination: sanitizeAuthReturnPath(input.nextPath),
        kind: "redirect" as const,
      };
    },

    async signUp(input: SignUpInput) {
      const destination = buildRoleSelectionPath(input.intent);
      const result = await gateway.signUpWithPassword({
        email: input.email,
        emailRedirectTo: buildAuthCallbackUrl(
          configuration.appUrl,
          destination,
        ),
        password: input.password,
      });

      if (result.kind === "failure") {
        return {
          kind: "failure" as const,
          message: AUTH_MESSAGES.providerUnavailable,
        };
      }

      if (result.confirmationRequired) {
        return {
          kind: "confirmation_required" as const,
          message: AUTH_MESSAGES.confirmationRequired,
        };
      }

      return {
        destination,
        kind: "redirect" as const,
      };
    },

    async beginGoogleSignIn(destination: unknown, intent?: RegistrationIntent) {
      void destination;
      void intent;
      const intendedDestination = buildRoleSelectionPath();
      const result = await gateway.beginGoogleSignIn({
        redirectTo: buildAuthCallbackUrl(
          configuration.appUrl,
          intendedDestination,
        ),
      });

      if (result.kind === "failure") {
        return {
          kind: "failure" as const,
          message: AUTH_MESSAGES.providerUnavailable,
        };
      }

      return {
        kind: "redirect" as const,
        url: result.url,
      };
    },

    async exchangeCallback(code: string) {
      if (!code.trim()) {
        return {
          kind: "failure" as const,
          message: AUTH_MESSAGES.invalidCallback,
        };
      }

      const result = await gateway.exchangeCodeForSession(code);

      if (result.kind === "failure") {
        return {
          kind: "failure" as const,
          message: AUTH_MESSAGES.invalidCallback,
        };
      }

      return { kind: "success" as const };
    },

    async resendConfirmation(email: string, intent?: RegistrationIntent) {
      await gateway.resendConfirmation({
        email,
        emailRedirectTo: buildAuthCallbackUrl(
          configuration.appUrl,
          buildRoleSelectionPath(intent),
        ),
      });

      return {
        kind: "success" as const,
        message: AUTH_MESSAGES.confirmationResent,
      };
    },

    async requestPasswordRecovery(email: string) {
      await gateway.requestPasswordRecovery({
        email,
        redirectTo: buildAuthCallbackUrl(
          configuration.appUrl,
          "/reset-password",
        ),
      });

      return {
        kind: "success" as const,
        message: AUTH_MESSAGES.recoveryRequested,
      };
    },

    async updatePassword(input: ResetPasswordInput) {
      const result = await gateway.updatePassword(input.password);

      if (result.kind === "failure") {
        return {
          kind: "failure" as const,
          message: AUTH_MESSAGES.invalidCallback,
        };
      }

      await gateway.signOut();

      return {
        kind: "success" as const,
        message: AUTH_MESSAGES.passwordUpdated,
      };
    },

    async requireVerifiedIdentity() {
      const identity = await gateway.getCurrentIdentity();

      if (!identity) {
        return {
          code: "authentication_required" as const,
          kind: "failure" as const,
          message: AUTH_MESSAGES.emailNotConfirmed,
        };
      }

      if (!identity.emailConfirmedAt && !identity.emailVerifiedByProvider) {
        return {
          code: "email_confirmation_required" as const,
          kind: "failure" as const,
          message: AUTH_MESSAGES.emailNotConfirmed,
        };
      }

      return {
        email: identity.email,
        identityId: identity.id,
        kind: "verified" as const,
      };
    },

    async signOut() {
      const result = await gateway.signOut();

      if (result.kind === "failure") {
        return {
          kind: "failure" as const,
          message: AUTH_MESSAGES.providerUnavailable,
        };
      }

      return { kind: "success" as const };
    },
  };
}
