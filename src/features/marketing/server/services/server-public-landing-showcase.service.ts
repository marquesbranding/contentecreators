import "server-only";

import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";

import { loadServerPublicLandingShowcaseSource } from "../repositories/drizzle-public-landing-showcase.repository";
import { createPublicLandingShowcaseService } from "./public-landing-showcase.service";

/**
 * Must outlive the route's CDN window (`s-maxage` + `stale-while-revalidate`
 * in `public-landing-showcase.handler.ts`), or visitors served a cached
 * response late in that window get valid JSON pointing at expired URLs — cards
 * that silently lose their photo with nothing in the console.
 */
export const publicShowcaseImageLifetimeSeconds = 900;

export function createServerPublicLandingShowcaseService() {
  const storage = createSupabaseAdminClient().storage;

  return createPublicLandingShowcaseService({
    loadShowcase: loadServerPublicLandingShowcaseSource,
    /* The landing is anonymous, so the authenticated signed-media path (which
     * requires an APPROVED session) cannot serve it. The service role signs
     * one object at a time over RLS; the `profile-media` bucket stays private. */
    async signImage(source) {
      const { data, error } = await storage
        .from(source.bucketName)
        .createSignedUrl(source.objectPath, publicShowcaseImageLifetimeSeconds);

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

export function loadPublicLandingShowcase() {
  return createServerPublicLandingShowcaseService().load();
}
