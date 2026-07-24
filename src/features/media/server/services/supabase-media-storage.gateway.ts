import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MediaStorageGateway } from "./media-upload.service";

export function createSupabaseMediaStorageGateway(
  client: SupabaseClient,
): MediaStorageGateway {
  return {
    async createSignedUpload({ bucketName, objectPath, upsert }) {
      const { data, error } = await client.storage
        .from(bucketName)
        .createSignedUploadUrl(objectPath, { upsert });

      return error || !data?.token ? null : { token: data.token };
    },

    async inspectObject({ bucketName, objectPath }) {
      const bucket = client.storage.from(bucketName);
      const [
        { data: fileInfo, error: infoError },
        { data: file, error: downloadError },
      ] = await Promise.all([
        bucket.info(objectPath),
        bucket.download(objectPath),
      ]);

      if (
        infoError ||
        downloadError ||
        !fileInfo ||
        !file ||
        (fileInfo.size !== undefined && fileInfo.size !== file.size)
      ) {
        return null;
      }

      const contentType = fileInfo.contentType ?? file.type;
      const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

      return {
        contentType,
        headerBytes,
        sizeBytes: file.size,
      };
    },
  };
}
