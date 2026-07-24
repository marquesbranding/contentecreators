import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SignedMediaStorageGateway } from "./signed-media.service";

export function createSupabaseSignedMediaGateway(
  client: SupabaseClient,
): SignedMediaStorageGateway {
  return {
    async createSignedDownload({ bucketName, expiresInSeconds, objectPath }) {
      const { data, error } = await client.storage
        .from(bucketName)
        .createSignedUrl(objectPath, expiresInSeconds);

      return error || !data?.signedUrl ? null : { signedUrl: data.signedUrl };
    },
  };
}
