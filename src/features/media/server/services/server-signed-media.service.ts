import "server-only";

import { cache } from "react";

import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";

import { createServerSignedMediaRepository } from "../repositories/drizzle-signed-media.repository";
import { createSignedMediaService } from "./signed-media.service";
import { createSupabaseSignedMediaGateway } from "./supabase-signed-media.gateway";

export async function createServerSignedMediaService() {
  return createSignedMediaService({
    now: () => new Date(),
    repository: await createServerSignedMediaRepository(),
    storage: createSupabaseSignedMediaGateway(createSupabaseAdminClient()),
  });
}

async function resolveServerSignedMedia(assetId: string) {
  const service = await createServerSignedMediaService();

  return service.getSignedMedia(assetId);
}

/**
 * Request-scoped Server Component deduplication. Authorization still runs on
 * every request and the returned bearer URL expires after five minutes.
 */
export const getServerSignedMedia = cache(resolveServerSignedMedia);
