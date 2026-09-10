import "server-only";

import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";

import { loadServerPublicCommunityProof } from "../repositories/drizzle-public-community-proof.repository";
import { createPublicCommunityProofService } from "./public-community-proof.service";

/**
 * Must outlive the route's own CDN window (`s-maxage` + `stale-while-revalidate`
 * in `public-community-proof.handler.ts`), or visitors served a cached response
 * late in that window get valid JSON pointing at already-expired URLs — an
 * avatar that silently fails to load with nothing in the console.
 */
export const publicCommunityAvatarLifetimeSeconds = 900;

export function createServerPublicCommunityProofService() {
  const storage = createSupabaseAdminClient().storage;

  return createPublicCommunityProofService({
    loadProof: loadServerPublicCommunityProof,
    /* The landing is anonymous, so the authenticated `signed-media` path
     * (which requires an APPROVED session) cannot serve it. This mirrors the
     * sponsorship delivery service: the service role signs one object at a
     * time over RLS, and the `profile-media` bucket stays private. */
    async signAvatar(source) {
      const { data, error } = await storage
        .from(source.bucketName)
        .createSignedUrl(
          source.objectPath,
          publicCommunityAvatarLifetimeSeconds,
        );

      if (error || !data?.signedUrl) {
        return null;
      }

      return {
        height: source.height,
        url: data.signedUrl,
        width: source.width,
      };
    },
  });
}

export function loadPublicCommunityProof() {
  return createServerPublicCommunityProofService().load();
}
