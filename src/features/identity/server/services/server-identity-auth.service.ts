import "server-only";

import { getPublicEnv } from "@/shared/lib/env/public-env";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import { createIdentityAuthService } from "./identity-auth.service";
import { createSupabaseAuthGateway } from "./supabase-auth.gateway";

export async function createServerIdentityAuthService() {
  const environment = getPublicEnv();
  const client = await createServerSupabaseClient();

  return createIdentityAuthService(createSupabaseAuthGateway(client), {
    appUrl: environment.NEXT_PUBLIC_APP_URL,
  });
}
