import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RegistrationIdentityGateway } from "./onboarding-registration.service";

function isAccountAlreadyRegisteredError(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered")
  );
}

export function createSupabaseRegistrationIdentityGateway(
  authClient: SupabaseClient,
  adminClient: SupabaseClient,
): RegistrationIdentityGateway {
  return {
    async deleteIdentity(identityId) {
      await adminClient.auth.admin.deleteUser(identityId, true);
    },

    async signUp({ callbackUrl, email, password }) {
      const { data, error } = await authClient.auth.signUp({
        email,
        options: { emailRedirectTo: callbackUrl },
        password,
      });

      if (error) {
        return isAccountAlreadyRegisteredError(error)
          ? { kind: "account_exists" }
          : { kind: "failure" };
      }

      if (data.user && data.user.identities?.length === 0) {
        return { kind: "account_exists" };
      }

      if (!data.user) {
        return { kind: "failure" };
      }

      return {
        confirmationRequired: data.session === null,
        identityId: data.user.id,
        kind: "success",
      };
    },
  };
}
