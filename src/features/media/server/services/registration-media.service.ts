import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDatabaseClient } from "@/db/client";
import { accounts, mediaAssets } from "@/db/schema";
import { withAuditedTransaction } from "@/features/audit/server";
import { loadRegistrationAccount } from "@/features/identity/server";
import { createSupabaseAdminClient } from "@/shared/server/supabase/admin-client";
import { createMediaUploadService } from "./media-upload.service";
import { createSupabaseMediaStorageGateway } from "./supabase-media-storage.gateway";

/** The verified pre-role account can only stage an avatar or cover, never activate a profile. */
export async function createRegistrationMediaService() {
  const { account } = await loadRegistrationAccount();
  return createMediaUploadService({
    createObjectId: () => crypto.randomUUID(),
    resolveCurrentSession: async () => ({
      kind: "authenticated",
      account: { id: account.id, role: "INFLUENCER", status: "ONBOARDING" },
    }),
    storage: createSupabaseMediaStorageGateway(createSupabaseAdminClient()),
    repository: {
      async createPendingMedia(input) {
        return withAuditedTransaction(
          {
            actorAccountId: null,
            actorRole: null,
            actorType: "SYSTEM",
            reason: "Stage registration media",
            requestId: input.requestId,
            source: "AUTH_HOOK",
          },
          async (transaction) => {
            const [current] = await transaction
              .select()
              .from(accounts)
              .where(eq(accounts.id, account.id))
              .for("update");
            if (
              current.role ||
              current.status !== "ONBOARDING" ||
              current.archivedAt
            )
              throw new Error("Registration unavailable");
            const { requestId: _requestId, ...metadata } = input;
            void _requestId;
            const [asset] = await transaction
              .insert(mediaAssets)
              .values({
                ...metadata,
                ownerAccountId: account.id,
                status: "PENDING",
              })
              .onConflictDoUpdate({
                target: [mediaAssets.bucketName, mediaAssets.objectPath],
                set: { status: "PENDING" },
              })
              .returning({ id: mediaAssets.id });
            return asset;
          },
        );
      },
    },
  });
}

export async function loadRegistrationMedia() {
  const { account } = await loadRegistrationAccount();
  const rows = await getDatabaseClient()
    .database.select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.ownerAccountId, account.id),
        eq(mediaAssets.status, "PENDING"),
        isNull(mediaAssets.archivedAt),
      ),
    )
    .orderBy(desc(mediaAssets.createdAt));
  const client = createSupabaseAdminClient();
  async function slot(kind: "AVATAR" | "COVER") {
    const asset = rows.find((row) => row.kind === kind);
    if (!asset) return { id: null, url: null };
    const { data } = await client.storage
      .from(asset.bucketName)
      .createSignedUrl(asset.objectPath, 600);
    return { id: asset.id, url: data?.signedUrl ?? null };
  }
  return { avatar: await slot("AVATAR"), cover: await slot("COVER") };
}
