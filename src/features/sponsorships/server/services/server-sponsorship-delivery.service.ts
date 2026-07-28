import "server-only";

import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";

import { createServerSponsorshipDeliveryRepository } from "../repositories/drizzle-sponsorship-delivery.repository";
import { createSponsorshipDeliveryService } from "./sponsorship-delivery.service";

const signedMediaLifetimeSeconds = 300;

export function createServerSponsorshipDeliveryService() {
  const repository = createServerSponsorshipDeliveryRepository();
  const storage = createSupabaseAdminClient().storage;

  return createSponsorshipDeliveryService({
    repository,
    async resolveSignedMedia(assetId, placementId, now) {
      const target = await repository.findSigningTarget({
        assetId,
        now,
        placementId,
      });

      if (!target) {
        return null;
      }

      const { data, error } = await storage
        .from(target.bucketName)
        .createSignedUrl(target.objectPath, signedMediaLifetimeSeconds);

      if (error || !data?.signedUrl) {
        return null;
      }

      return {
        height: target.height,
        url: data.signedUrl,
        width: target.width,
      };
    },
  });
}
