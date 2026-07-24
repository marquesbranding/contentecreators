import "server-only";

import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import { resolveFreshServerCurrentSession } from "../dal/current-account";
import { createBannedAccountDefenseService } from "./banned-account-defense.service";
import { createSupabaseBannedIdentityGateway } from "./supabase-banned-identity.gateway";

export async function createServerBannedAccountDefenseService() {
  const sessionClient = await createServerSupabaseClient();
  const gateway = createSupabaseBannedIdentityGateway(
    sessionClient,
    createSupabaseAdminClient(),
  );

  return createBannedAccountDefenseService({
    banIdentity: (identityId) => gateway.banIdentity(identityId),
    getCurrentAccessToken: () => gateway.getCurrentAccessToken(),
    resolveCurrentIdentityId: () => gateway.resolveCurrentIdentityId(),
    resolveCurrentSession: resolveFreshServerCurrentSession,
    revokeAccessToken: (accessToken) => gateway.revokeAccessToken(accessToken),
    signOut: () => gateway.signOut(),
  });
}
