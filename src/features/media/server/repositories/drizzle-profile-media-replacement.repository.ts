import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { companyProfiles, creatorProfiles, mediaAssets } from "@/db/schema";
import { applyVerifiedAuditContext } from "@/features/audit/server";
import {
  AccountAccessError,
  createServerVerifiedAccountTransactionRunner,
  type CurrentAccountDto,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";
import { persistCurrentAccountProfileCompletion } from "@/features/onboarding/server";

import { isMediaPurposeAllowed } from "../../domain/media-upload-policy";
import type { ProfileMediaPurpose } from "../../types/media-upload.types";
import type { ProfileMediaReplacementRepository } from "../services/profile-media-replacement.service";

interface DrizzleProfileMediaReplacementDependencies {
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

async function findCurrentProfileMedia(
  transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
  account: CurrentAccountDto,
  purpose: ProfileMediaPurpose,
) {
  if (account.role === "INFLUENCER") {
    const [profile] = await transaction
      .select({
        currentAssetId:
          purpose === "AVATAR"
            ? creatorProfiles.avatarAssetId
            : creatorProfiles.coverAssetId,
        id: creatorProfiles.id,
        version: creatorProfiles.version,
      })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.accountId, account.id))
      .limit(1)
      .for("update");

    return profile ?? null;
  }

  if (account.role === "COMPANY") {
    const [profile] = await transaction
      .select({
        currentAssetId:
          purpose === "LOGO"
            ? companyProfiles.logoAssetId
            : companyProfiles.coverAssetId,
        id: companyProfiles.id,
        version: companyProfiles.version,
      })
      .from(companyProfiles)
      .where(eq(companyProfiles.accountId, account.id))
      .limit(1)
      .for("update");

    return profile ?? null;
  }

  return null;
}

async function updateProfileReference(
  transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
  account: CurrentAccountDto,
  purpose: ProfileMediaPurpose,
  profileId: string,
  assetId: string | null,
) {
  if (account.role === "INFLUENCER") {
    const [updated] = await transaction
      .update(creatorProfiles)
      .set({
        ...(purpose === "AVATAR"
          ? { avatarAssetId: assetId }
          : { coverAssetId: assetId }),
        updatedAt: new Date(),
        version: sql`${creatorProfiles.version} + 1`,
      })
      .where(eq(creatorProfiles.id, profileId))
      .returning({ version: creatorProfiles.version });

    return updated?.version ?? null;
  }

  if (account.role === "COMPANY") {
    const [updated] = await transaction
      .update(companyProfiles)
      .set({
        ...(purpose === "LOGO"
          ? { logoAssetId: assetId }
          : { coverAssetId: assetId }),
        updatedAt: new Date(),
        version: sql`${companyProfiles.version} + 1`,
      })
      .where(eq(companyProfiles.id, profileId))
      .returning({ version: companyProfiles.version });

    return updated?.version ?? null;
  }

  return null;
}

export function createDrizzleProfileMediaReplacementRepository({
  runVerifiedAccountTransaction,
}: DrizzleProfileMediaReplacementDependencies): ProfileMediaReplacementRepository {
  return {
    async removeProfileMedia(input) {
      return runVerifiedAccountTransaction(
        { preferredRole: "NON_ADMIN", requestId: input.requestId },
        async (transaction, context) => {
          const account: CurrentAccountDto = {
            id: context.accountId,
            role: context.role,
            status: context.status,
          };

          if (!isMediaPurposeAllowed(account, input.purpose)) {
            throw new AccountAccessError("ROLE_FORBIDDEN");
          }

          const profile = await findCurrentProfileMedia(
            transaction,
            account,
            input.purpose,
          );

          if (!profile) {
            return { kind: "not_found" as const };
          }

          if (!profile.currentAssetId) {
            return {
              kind: "removed" as const,
              profileVersion: profile.version,
            };
          }

          await applyVerifiedAuditContext(transaction, {
            actorAccountId: account.id,
            actorRole: account.role,
            actorType: "USER",
            reason: "Remove active profile media",
            requestId: input.requestId,
            source: "APPLICATION",
          });

          const [archivedAsset] = await transaction
            .update(mediaAssets)
            .set({
              archivedAt: new Date(),
              status: "ARCHIVED",
              updatedAt: new Date(),
              version: sql`${mediaAssets.version} + 1`,
            })
            .where(
              and(
                eq(mediaAssets.id, profile.currentAssetId),
                eq(mediaAssets.ownerAccountId, account.id),
              ),
            )
            .returning({ id: mediaAssets.id });

          if (!archivedAsset) {
            throw new Error("Current media asset could not be archived.");
          }

          const profileVersion = await updateProfileReference(
            transaction,
            account,
            input.purpose,
            profile.id,
            null,
          );

          if (!profileVersion) {
            throw new Error("Profile media reference update failed.");
          }
          if (account.role !== "INFLUENCER" && account.role !== "COMPANY") {
            throw new AccountAccessError("ROLE_FORBIDDEN");
          }
          await persistCurrentAccountProfileCompletion(
            transaction,
            account.id,
            account.role,
          );

          return {
            kind: "removed" as const,
            profileVersion,
          };
        },
      );
    },

    async activateProfileMedia(input) {
      return runVerifiedAccountTransaction(
        { preferredRole: "NON_ADMIN", requestId: input.requestId },
        async (transaction, context) => {
          const account: CurrentAccountDto = {
            id: context.accountId,
            role: context.role,
            status: context.status,
          };

          if (!isMediaPurposeAllowed(account, input.purpose)) {
            throw new AccountAccessError("ROLE_FORBIDDEN");
          }

          const profile = await findCurrentProfileMedia(
            transaction,
            account,
            input.purpose,
          );

          if (!profile) {
            return { kind: "not_found" as const };
          }

          const [pendingAsset] = await transaction
            .select({
              archivedAt: mediaAssets.archivedAt,
              id: mediaAssets.id,
              kind: mediaAssets.kind,
              ownerAccountId: mediaAssets.ownerAccountId,
              status: mediaAssets.status,
            })
            .from(mediaAssets)
            .where(
              and(
                eq(mediaAssets.id, input.assetId),
                eq(mediaAssets.ownerAccountId, account.id),
              ),
            )
            .limit(1)
            .for("update");

          if (
            !pendingAsset ||
            pendingAsset.kind !== input.purpose ||
            pendingAsset.archivedAt
          ) {
            return { kind: "not_found" as const };
          }

          if (
            profile.currentAssetId === pendingAsset.id &&
            pendingAsset.status === "ACTIVE"
          ) {
            const [predecessor] = await transaction
              .select({ id: mediaAssets.id })
              .from(mediaAssets)
              .where(eq(mediaAssets.replacedByAssetId, pendingAsset.id))
              .limit(1);

            return {
              assetId: pendingAsset.id,
              kind: "activated" as const,
              profileVersion: profile.version,
              replacedAssetId: predecessor?.id ?? null,
            };
          }

          if (
            pendingAsset.status !== "PENDING" ||
            profile.currentAssetId !== input.expectedCurrentAssetId
          ) {
            return { kind: "conflict" as const };
          }

          await applyVerifiedAuditContext(transaction, {
            actorAccountId: account.id,
            actorRole: account.role,
            actorType: "USER",
            reason: "Activate validated profile media replacement",
            requestId: input.requestId,
            source: "APPLICATION",
          });

          const [activatedAsset] = await transaction
            .update(mediaAssets)
            .set({
              status: "ACTIVE",
              updatedAt: new Date(),
              version: sql`${mediaAssets.version} + 1`,
            })
            .where(
              and(
                eq(mediaAssets.id, pendingAsset.id),
                eq(mediaAssets.status, "PENDING"),
                isNull(mediaAssets.archivedAt),
              ),
            )
            .returning({ id: mediaAssets.id });

          if (!activatedAsset) {
            throw new Error("Pending media activation lost its lock.");
          }

          if (profile.currentAssetId) {
            const [archivedAsset] = await transaction
              .update(mediaAssets)
              .set({
                archivedAt: new Date(),
                replacedByAssetId: pendingAsset.id,
                status: "ARCHIVED",
                updatedAt: new Date(),
                version: sql`${mediaAssets.version} + 1`,
              })
              .where(
                and(
                  eq(mediaAssets.id, profile.currentAssetId),
                  eq(mediaAssets.ownerAccountId, account.id),
                ),
              )
              .returning({ id: mediaAssets.id });

            if (!archivedAsset) {
              throw new Error("Current media asset could not be archived.");
            }
          }

          const profileVersion = await updateProfileReference(
            transaction,
            account,
            input.purpose,
            profile.id,
            pendingAsset.id,
          );

          if (!profileVersion) {
            throw new Error("Profile media reference update failed.");
          }
          if (account.role !== "INFLUENCER" && account.role !== "COMPANY") {
            throw new AccountAccessError("ROLE_FORBIDDEN");
          }
          await persistCurrentAccountProfileCompletion(
            transaction,
            account.id,
            account.role,
          );

          return {
            assetId: pendingAsset.id,
            kind: "activated" as const,
            profileVersion,
            replacedAssetId: profile.currentAssetId,
          };
        },
      );
    },
  };
}

export async function createServerProfileMediaReplacementRepository() {
  return createDrizzleProfileMediaReplacementRepository({
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
