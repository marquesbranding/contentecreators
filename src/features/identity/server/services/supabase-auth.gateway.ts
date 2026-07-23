import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CurrentIdentity,
  IdentityAuthGateway,
} from "./identity-auth.service";

function failure(code?: string): { code: string; kind: "failure" } {
  return {
    code: code ?? "provider_failure",
    kind: "failure",
  };
}

export function createSupabaseAuthGateway(
  client: SupabaseClient,
): IdentityAuthGateway {
  return {
    async beginGoogleSignIn({ redirectTo }) {
      const { data, error } = await client.auth.signInWithOAuth({
        options: {
          redirectTo,
        },
        provider: "google",
      });

      if (error || !data.url) {
        return failure(error?.code);
      }

      return {
        kind: "success",
        url: data.url,
      };
    },

    async exchangeCodeForSession(code) {
      const { error } = await client.auth.exchangeCodeForSession(code);

      return error ? failure(error.code) : { kind: "success" };
    },

    async getCurrentIdentity(): Promise<CurrentIdentity | null> {
      const {
        data: { user },
        error,
      } = await client.auth.getUser();

      if (error || !user?.email) {
        return null;
      }

      const emailVerifiedByProvider =
        user.identities?.some(
          (identity) =>
            identity.provider === "google" &&
            identity.identity_data?.email_verified === true,
        ) ?? false;

      return {
        email: user.email,
        emailConfirmedAt: user.email_confirmed_at ?? null,
        emailVerifiedByProvider,
        id: user.id,
      };
    },

    async requestPasswordRecovery({ email, redirectTo }) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      return error ? failure(error.code) : { kind: "success" };
    },

    async resendConfirmation({ email, emailRedirectTo }) {
      const { error } = await client.auth.resend({
        email,
        options: {
          emailRedirectTo,
        },
        type: "signup",
      });

      return error ? failure(error.code) : { kind: "success" };
    },

    async signInWithPassword({ email, password }) {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      return error ? failure(error.code) : { kind: "success" };
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: "local" });

      return error ? failure(error.code) : { kind: "success" };
    },

    async signUpWithPassword({ email, emailRedirectTo, password }) {
      const { data, error } = await client.auth.signUp({
        email,
        options: {
          emailRedirectTo,
        },
        password,
      });

      if (error) {
        return failure(error.code);
      }

      return {
        confirmationRequired: data.session === null,
        kind: "success",
      };
    },

    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });

      return error ? failure(error.code) : { kind: "success" };
    },
  };
}
