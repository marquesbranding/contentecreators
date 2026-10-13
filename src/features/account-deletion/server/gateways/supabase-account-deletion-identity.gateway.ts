import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TERMINAL_BAN_DURATION = "876000h";

export interface ReauthenticationContext {
  authUserId: string;
  email: string | null;
  hasPassword: boolean;
  lastSignInAt: string | null;
}

export function createSupabaseAccountDeletionIdentityGateway({
  adminClient,
  publishableClient,
  sessionClient,
}: {
  adminClient: SupabaseClient;
  /** Stateless client used only to verify a password without touching the session. */
  publishableClient: SupabaseClient;
  sessionClient: SupabaseClient;
}) {
  return {
    async banIdentity(identityId: string) {
      const { error } = await adminClient.auth.admin.updateUserById(
        identityId,
        { ban_duration: TERMINAL_BAN_DURATION },
      );

      return !error;
    },

    async deleteIdentity(identityId: string) {
      // Soft delete keeps the Auth row (the application FK stays valid) while
      // Supabase removes the e-mail, phone, metadata and linked identities.
      const { error } = await adminClient.auth.admin.deleteUser(
        identityId,
        true,
      );

      return !error;
    },

    async getReauthenticationContext(): Promise<ReauthenticationContext | null> {
      const { data, error } = await sessionClient.auth.getUser();

      if (error || !data.user) {
        return null;
      }

      const providers = Array.isArray(data.user.app_metadata?.providers)
        ? (data.user.app_metadata.providers as string[])
        : [data.user.app_metadata?.provider as string | undefined];

      return {
        authUserId: data.user.id,
        email: data.user.email ?? null,
        hasPassword: providers.includes("email"),
        lastSignInAt: data.user.last_sign_in_at ?? null,
      };
    },

    async signOutEverywhere() {
      const { data } = await sessionClient.auth.getSession();
      const accessToken = data.session?.access_token;

      if (accessToken) {
        await adminClient.auth.admin.signOut(accessToken, "global");
      }

      await sessionClient.auth.signOut({ scope: "local" });
    },

    async unbanIdentity(identityId: string) {
      const { error } = await adminClient.auth.admin.updateUserById(
        identityId,
        { ban_duration: "none" },
      );

      return !error;
    },

    async verifyPassword(email: string, password: string) {
      const { error } = await publishableClient.auth.signInWithPassword({
        email,
        password,
      });

      return !error;
    },

    async removeStorageObjects(bucket: string, paths: string[]) {
      if (paths.length === 0) {
        return true;
      }

      const { error } = await adminClient.storage.from(bucket).remove(paths);

      return !error;
    },
  };
}

export type AccountDeletionIdentityGateway = ReturnType<
  typeof createSupabaseAccountDeletionIdentityGateway
>;

export function createStatelessPublishableClient(
  url: string,
  publishableKey: string,
) {
  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
