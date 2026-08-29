import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { companyProfiles, mediaAssets } from "@/db/schema";
import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

import type { CompanyMediaFormState } from "../../types/media-upload.types";

export async function loadCurrentCompanyMediaFormState(): Promise<CompanyMediaFormState> {
  const runVerifiedTransaction =
    await createServerVerifiedAccountTransactionRunner();

  return runVerifiedTransaction(
    { requestId: crypto.randomUUID() },
    async (transaction, account) => {
      if (
        account.role !== "COMPANY" ||
        (account.status !== "ONBOARDING" &&
          account.status !== "CHANGES_REQUESTED" &&
          account.status !== "PENDING_REVIEW" &&
          account.status !== "APPROVED")
      ) {
        throw new Error("Account cannot load company media form state.");
      }

      const [profile] = await transaction
        .select({
          coverAssetId: companyProfiles.coverAssetId,
          logoAssetId: companyProfiles.logoAssetId,
        })
        .from(companyProfiles)
        .where(eq(companyProfiles.accountId, account.accountId))
        .limit(1);

      if (profile) {
        return {
          coverAssetId: profile.coverAssetId,
          logoAssetId: profile.logoAssetId,
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
            inArray(mediaAssets.kind, ["LOGO", "COVER"]),
            isNull(mediaAssets.archivedAt),
          ),
        )
        .orderBy(desc(mediaAssets.updatedAt), desc(mediaAssets.id));

      return {
        coverAssetId:
          pendingMedia.find((media) => media.kind === "COVER")?.id ?? null,
        logoAssetId:
          pendingMedia.find((media) => media.kind === "LOGO")?.id ?? null,
        profileExists: false,
      };
    },
  );
}
