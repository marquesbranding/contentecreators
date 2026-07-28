import "server-only";

import { getPublicEnv } from "@/shared/lib/env/public-env";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";
import { createServerRateLimitService } from "@/features/security/server";
import {
  createRateLimitKey,
  type RateLimitPolicyName,
} from "@/shared/server/security/rate-limit";

import { createIdentityAuthService } from "./identity-auth.service";
import { createSupabaseAuthGateway } from "./supabase-auth.gateway";

export async function createServerIdentityAuthService() {
  const environment = getPublicEnv();
  const client = await createServerSupabaseClient();
  const rateLimits = createServerRateLimitService();

  return createIdentityAuthService(
    createSupabaseAuthGateway(client),
    {
      appUrl: environment.NEXT_PUBLIC_APP_URL,
    },
    {
      consume: ({
        identity,
        policy,
      }: {
        identity: string;
        policy: RateLimitPolicyName;
      }) =>
        rateLimits.consume({
          key: createRateLimitKey([`email:${identity.trim().toLowerCase()}`]),
          policy,
        }),
    },
  );
}
