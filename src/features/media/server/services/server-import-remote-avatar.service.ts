import "server-only";
import { loadRegistrationAccount } from "@/features/identity/server";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";
import { operationalLogger } from "@/shared/server/observability/operational-logger";
import { fetchGoogleAvatar } from "./import-remote-avatar.service";
import {
  createRegistrationMediaService,
  loadRegistrationMedia,
} from "./registration-media.service";

export async function importRegistrationGoogleAvatar() {
  const { user } = await loadRegistrationAccount();
  const current = await loadRegistrationMedia();
  if (
    current.avatar.id ||
    !user.identities?.some((identity) => identity.provider === "google")
  )
    return current;
  const source = user.user_metadata.avatar_url ?? user.user_metadata.picture;
  if (typeof source !== "string") return current;
  const requestId = crypto.randomUUID();
  try {
    const bytes = await fetchGoogleAvatar(source);
    const service = await createRegistrationMediaService();
    const prepared = await service.prepareUpload({
      declaredMimeType: "image/webp",
      fileName: "avatar.webp",
      purpose: "AVATAR",
      requestId,
      sizeBytes: bytes.length,
    });
    if (prepared.kind !== "prepared")
      throw new Error("Avatar upload unavailable");
    const { bucketName, objectPath, token } = prepared.upload;
    const { error } = await createSupabaseAdminClient()
      .storage.from(bucketName)
      .uploadToSignedUrl(objectPath, token, bytes, {
        contentType: "image/webp",
      });
    if (error) throw error;
    const finalized = await service.finalizeUpload({
      bucketName,
      objectPath,
      purpose: "AVATAR",
      requestId,
    });
    if (finalized.kind !== "finalized")
      throw new Error("Avatar finalization unavailable");
    return loadRegistrationMedia();
  } catch {
    operationalLogger.warn({
      event: "user_facing_error",
      operation: "import_google_avatar",
      outcome: "unavailable",
      requestId,
    });
    return current;
  }
}
