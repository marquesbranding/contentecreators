import "server-only";

import {
  buildBackofficeAuthCheckPath,
  sanitizeBackofficeReturnPath,
} from "../../domain/backoffice-return-path";
import type { LoginInput } from "../../schemas/auth-form-schemas";
import type { CurrentSessionDto } from "../../types/current-account.types";
import {
  AccountAccessError,
  requireAdmin,
  requireAccount,
} from "../policies/account-access.guards";

export const BACKOFFICE_AUTH_MESSAGES = {
  providerUnavailable:
    "Não foi possível entrar com o Google agora. Tente novamente em instantes.",
  unauthorized:
    "Não foi possível autorizar o acesso administrativo com esta conta.",
} as const;

type SignInResult =
  | {
      destination: string;
      kind: "redirect";
    }
  | {
      kind: "failure";
      message: string;
    };

interface BackofficeAuthServiceDependencies {
  beginGoogleSignIn(destination: string): Promise<
    | {
        kind: "redirect";
        url: string;
      }
    | {
        kind: "failure";
        message: string;
      }
  >;
  resolveCurrentSession(requestId: string): Promise<CurrentSessionDto>;
  signIn(input: LoginInput): Promise<SignInResult>;
  signOut(): Promise<unknown>;
}

function isAuthorizedAdmin(session: CurrentSessionDto) {
  try {
    requireAdmin(requireAccount(session));
    return true;
  } catch (error) {
    if (error instanceof AccountAccessError) {
      return false;
    }

    throw error;
  }
}

export function createBackofficeAuthService(
  dependencies: BackofficeAuthServiceDependencies,
) {
  async function resolveDestination(
    destination: unknown,
    requestId: string,
    terminateDeniedSession: boolean,
  ): Promise<SignInResult> {
    const session = await dependencies.resolveCurrentSession(requestId);

    if (!isAuthorizedAdmin(session)) {
      if (terminateDeniedSession) {
        await dependencies.signOut();
      }

      return {
        kind: "failure",
        message: BACKOFFICE_AUTH_MESSAGES.unauthorized,
      };
    }

    return {
      destination: sanitizeBackofficeReturnPath(destination),
      kind: "redirect",
    };
  }

  return {
    async authorize(requestId: string) {
      const session = await dependencies.resolveCurrentSession(requestId);

      return isAuthorizedAdmin(session)
        ? { kind: "authorized" as const }
        : { kind: "denied" as const };
    },

    beginGoogleSignIn(destination: unknown) {
      return dependencies.beginGoogleSignIn(
        buildBackofficeAuthCheckPath(destination),
      );
    },

    completeGoogleSignIn(destination: unknown, requestId: string) {
      return resolveDestination(destination, requestId, true);
    },

    async signIn(input: LoginInput, requestId: string): Promise<SignInResult> {
      const destination = sanitizeBackofficeReturnPath(input.nextPath);
      const authentication = await dependencies.signIn({
        ...input,
        nextPath: destination,
      });

      if (authentication.kind === "failure") {
        return authentication;
      }

      return resolveDestination(destination, requestId, true);
    },
  };
}
