import "server-only";

import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";

import { createServerMediaCleanupRepository } from "../repositories/drizzle-media-cleanup.repository";
import { createMediaCleanupService } from "./media-cleanup.service";
import { createSupabaseMediaCleanupGateway } from "./supabase-media-cleanup.gateway";

export function createServerMediaCleanupService() {
  const storage = createSupabaseMediaCleanupGateway(
    createSupabaseAdminClient(),
  );

  return createMediaCleanupService({
    findCandidates: (input) =>
      createServerMediaCleanupRepository().findCandidates(input),
    now: () => new Date(),
    removeObjects: (input) => storage.removeObjects(input),
  });
}
