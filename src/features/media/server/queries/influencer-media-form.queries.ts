import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { creatorProfiles, mediaAssets } from "@/db/schema";
import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import type { InfluencerMediaFormState } from "../../types/media-upload.types";

export async function loadCurrentInfluencerMediaFormState(): Promise<InfluencerMediaFormState> {
  const runVerifiedTransaction =
    await createServerVerifiedAccountTransactionRunner();

  return runVerifiedTransaction(
    { preferredRole: "NON_ADMIN", requestId: crypto.randomUUID() },
    async (transaction, account) => {
      if (
        account.role !== "INFLUENCER" ||
        (account.status !== "ONBOARDING" &&
          account.status !== "CHANGES_REQUESTED" &&
          account.status !== "PENDING_REVIEW" &&
          account.status !== "APPROVED")
      ) {
        throw new Error("Account cannot load influencer media form state.");
      }

      const [profile] = await transaction
        .select({
          avatarAssetId: creatorProfiles.avatarAssetId,
          coverAssetId: creatorProfiles.coverAssetId,
        })
        .from(creatorProfiles)
        .where(eq(creatorProfiles.accountId, account.accountId))
        .limit(1);

      if (profile) {
        return {
          avatarAssetId: profile.avatarAssetId,
          coverAssetId: profile.coverAssetId,
          profileExists: true,
        };
      }

      const pendingMedia = await transaction
        .select({
          id: mediaAssets.id,
          kind: mediaAssets.kind,
        })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.ownerAccountId, account.accountId),
            eq(mediaAssets.status, "PENDING"),
            inArray(mediaAssets.kind, ["AVATAR", "COVER"]),
            isNull(mediaAssets.archivedAt),
          ),
        )
        .orderBy(desc(mediaAssets.updatedAt), desc(mediaAssets.id));
      const ownedPendingMedia = pendingMedia.filter(
        (media) => media.kind === "AVATAR" || media.kind === "COVER",
      );

      return {
        avatarAssetId:
          ownedPendingMedia.find((media) => media.kind === "AVATAR")?.id ??
          null,
        coverAssetId:
          ownedPendingMedia.find((media) => media.kind === "COVER")?.id ?? null,
        profileExists: false,
      };
    },
  );
}
