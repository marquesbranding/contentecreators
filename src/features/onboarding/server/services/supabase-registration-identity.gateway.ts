import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RegistrationIdentityGateway } from "./onboarding-registration.service";

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

      if (error || !data.user || data.user.identities?.length === 0) {
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
