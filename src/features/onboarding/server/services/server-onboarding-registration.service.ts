import "server-only";

import { createServerEmailDeliveryProcessor } from "@/features/communications/server";
import { createServerRateLimitService } from "@/features/security/server";
import { getPublicEnv } from "@/shared/lib/env/public-env";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";
import { createRateLimitKey } from "@/shared/server/security/rate-limit";

import { createDrizzleOnboardingRegistrationRepository } from "../repositories/drizzle-onboarding-registration.repository";
import { createOnboardingRegistrationService } from "./onboarding-registration.service";
import { createSupabaseRegistrationIdentityGateway } from "./supabase-registration-identity.gateway";

export async function createServerOnboardingRegistrationService() {
  const environment = getPublicEnv();
  const authClient = await createServerSupabaseClient();
  const adminClient = createSupabaseAdminClient();
  const emailDelivery = createServerEmailDeliveryProcessor();
  const rateLimits = createServerRateLimitService();
  function callbackUrl(destination: string) {
    const url = new URL("/auth/callback", environment.NEXT_PUBLIC_APP_URL);
    url.searchParams.set("next", destination);
    return url.toString();
  }

  return createOnboardingRegistrationService(
    createSupabaseRegistrationIdentityGateway(authClient, adminClient),
    createDrizzleOnboardingRegistrationRepository(),
    {
      callbackUrls: {
        COMPANY: callbackUrl("/onboarding/company"),
        INFLUENCER: callbackUrl("/onboarding/influencer"),
      },
    },
    emailDelivery,
    {
      consume: (email) =>
        rateLimits.consume({
          key: createRateLimitKey([`email:${email.trim().toLowerCase()}`]),
          policy: "signUp",
        }),
    },
  );
}
