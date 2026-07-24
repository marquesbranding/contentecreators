import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const TERMINAL_BAN_DURATION = "876000h";

export function createSupabaseBannedIdentityGateway(
  sessionClient: SupabaseClient,
  adminClient: SupabaseClient,
) {
  return {
    async banIdentity(identityId: string) {
      const { data, error } = await adminClient.auth.admin.updateUserById(
        identityId,
        {
          ban_duration: TERMINAL_BAN_DURATION,
        },
      );

      return !error && Boolean(data.user);
    },

    async getCurrentAccessToken() {
      const { data, error } = await sessionClient.auth.getSession();

      return error ? null : (data.session?.access_token ?? null);
    },

    async resolveCurrentIdentityId() {
      const { data, error } = await sessionClient.auth.getUser();

      return error ? null : (data.user?.id ?? null);
    },

    async revokeAccessToken(accessToken: string) {
      const { error } = await adminClient.auth.admin.signOut(
        accessToken,
        "global",
      );

      return !error;
    },

    async signOut() {
      await sessionClient.auth.signOut({ scope: "local" });
    },
  };
}
