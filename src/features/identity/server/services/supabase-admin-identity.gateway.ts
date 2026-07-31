import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AdminIdentity } from "./admin-provisioning.service";

const PRODUCTION_PASSWORD_SEEDED_KEY =
  "production_admin_password_seeded" as const;

function toIdentity(user: {
  email?: string | null;
  id: string;
}): AdminIdentity | null {
  return user.email
    ? {
        email: user.email.trim().toLowerCase(),
        id: user.id,
      }
    : null;
}

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

    async preparePasswordIdentity(input: {
      email: string;
      existingIdentity: AdminIdentity | null;
      password: string;
    }) {
      if (!input.existingIdentity) {
        const { data, error } = await client.auth.admin.createUser({
          app_metadata: { [PRODUCTION_PASSWORD_SEEDED_KEY]: true },
          email: input.email,
          email_confirm: true,
          password: input.password,
        });
        const identity = data.user ? toIdentity(data.user) : null;

        return error || !identity
          ? null
          : {
              identity,
              passwordSeeded: true,
            };
      }

      const { data, error } = await client.auth.admin.getUserById(
        input.existingIdentity.id,
      );

      if (error || !data.user) {
        return null;
      }

      return {
        identity: input.existingIdentity,
        passwordSeeded:
          data.user.app_metadata[PRODUCTION_PASSWORD_SEEDED_KEY] === true,
      };
    },

    async seedExistingPassword(input: {
      identity: AdminIdentity;
      password: string;
    }) {
      const current = await client.auth.admin.getUserById(input.identity.id);

      if (current.error || !current.data.user) {
        return null;
      }

      const { data, error } = await client.auth.admin.updateUserById(
        input.identity.id,
        {
          app_metadata: {
            ...current.data.user.app_metadata,
            [PRODUCTION_PASSWORD_SEEDED_KEY]: true,
          },
          email_confirm: true,
          password: input.password,
        },
      );

      return error || !data.user ? null : toIdentity(data.user);
    },
  };
}
