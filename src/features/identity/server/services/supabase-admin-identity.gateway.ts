import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminIdentity } from "./admin-provisioning.service";

export function createSupabaseAdminIdentityGateway(
  client: SupabaseClient,
  configuration: {
    redirectTo: string;
  },
) {
  return {
    async inviteIdentity(email: string): Promise<AdminIdentity | null> {
      const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
        redirectTo: configuration.redirectTo,
      });

      if (error || !data.user?.email) {
        return null;
      }

      return {
        email: data.user.email.trim().toLowerCase(),
        id: data.user.id,
      };
    },
  };
}
