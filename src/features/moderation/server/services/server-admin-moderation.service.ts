import "server-only";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";

import { createServerAdminModerationRepository } from "../repositories/drizzle-admin-moderation.repository";
import { createAdminModerationService } from "./admin-moderation.service";
import { createSupabaseModerationIdentityGateway } from "./supabase-moderation-identity.gateway";

export async function createServerAdminModerationService() {
  const repository = await createServerAdminModerationRepository();
  const identityGateway = createSupabaseModerationIdentityGateway(
    createSupabaseAdminClient(),
  );

  return createAdminModerationService({
    applyTransition: (command) => repository.applyTransition(command),
    invalidateEligibility: () => {
      revalidatePath("/app");
      revalidatePath("/app/catalog");
      revalidatePath("/backoffice");
    },
    markAuthEffectFailed: (input) => repository.markAuthEffectFailed(input),
    markAuthEffectSynced: (input) => repository.markAuthEffectSynced(input),
    resolveRetryableAuthEffect: (input) =>
      repository.resolveRetryableAuthEffect(input),
    syncAuthIdentity: (input) => identityGateway.syncAuthIdentity(input),
  });
}
