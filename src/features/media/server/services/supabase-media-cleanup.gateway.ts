import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MediaBucketName } from "../../types/media-upload.types";

const MAX_STORAGE_DELETE_BATCH = 1_000;

export class MediaCleanupStorageError extends Error {
  readonly code = "MEDIA_CLEANUP_STORAGE_FAILED";

  constructor() {
    super("Supabase Storage rejected the media cleanup batch.");
    this.name = "MediaCleanupStorageError";
  }
}

export function createSupabaseMediaCleanupGateway(client: SupabaseClient) {
  return {
    async removeObjects(input: {
      bucketName: MediaBucketName;
      objectPaths: string[];
    }) {
      if (
        input.objectPaths.length === 0 ||
        input.objectPaths.length > MAX_STORAGE_DELETE_BATCH
      ) {
        throw new MediaCleanupStorageError();
      }

      const { error } = await client.storage
        .from(input.bucketName)
        .remove(input.objectPaths);

      if (error) {
        throw new MediaCleanupStorageError();
      }
    },
  };
}
