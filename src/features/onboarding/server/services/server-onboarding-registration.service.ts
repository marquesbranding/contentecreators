import "server-only";

import { getPublicEnv } from "@/shared/lib/env/public-env";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import { createDrizzleOnboardingRegistrationRepository } from "../repositories/drizzle-onboarding-registration.repository";
import { createOnboardingRegistrationService } from "./onboarding-registration.service";
import { createSupabaseRegistrationIdentityGateway } from "./supabase-registration-identity.gateway";

export async function createServerOnboardingRegistrationService() {
  const environment = getPublicEnv();
  const authClient = await createServerSupabaseClient();
  const adminClient = createSupabaseAdminClient();
  const callbackUrl = new URL(
    "/auth/callback",
    environment.NEXT_PUBLIC_APP_URL,
  );
  callbackUrl.searchParams.set("next", "/app/status/analysis");

  return createOnboardingRegistrationService(
    createSupabaseRegistrationIdentityGateway(authClient, adminClient),
    createDrizzleOnboardingRegistrationRepository(),
    { callbackUrl: callbackUrl.toString() },
  );
}
