import "server-only";

import { resolveFreshServerCurrentSession } from "@/features/identity/server";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";

import { createServerMediaUploadRepository } from "../repositories/drizzle-media-upload.repository";
import { createMediaUploadService } from "./media-upload.service";
import { createSupabaseMediaStorageGateway } from "./supabase-media-storage.gateway";

export async function createServerMediaUploadService() {
  return createMediaUploadService({
    createObjectId: () => crypto.randomUUID(),
    repository: await createServerMediaUploadRepository(),
    resolveCurrentSession: resolveFreshServerCurrentSession,
    storage: createSupabaseMediaStorageGateway(createSupabaseAdminClient()),
  });
}
