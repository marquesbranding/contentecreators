import "server-only";

import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import {
  createRateLimitKey,
  createRateLimitService,
  type RateLimitPolicyName,
} from "@/shared/server/security/rate-limit";

import { consumePostgresRateLimit } from "../repositories/postgres-rate-limit.repository";

export function createServerRateLimitService() {
  return createRateLimitService({ consume: consumePostgresRateLimit });
}

export async function consumeIdentityRateLimit(
  policy: RateLimitPolicyName,
  fallbackIdentity = "unauthenticated",
) {
  let identity = fallbackIdentity;

  try {
    const client = await createServerSupabaseClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    identity = user?.id ?? fallbackIdentity;
  } catch {
    // The limiter remains fail-safe and privacy-safe for unauthenticated calls.
  }

  return createServerRateLimitService().consume({
    key: createRateLimitKey([`identity:${identity}`]),
    policy,
  });
}
