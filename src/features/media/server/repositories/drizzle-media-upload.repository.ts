import "server-only";

import { and, eq } from "drizzle-orm";

import { mediaAssets } from "@/db/schema";
import { applyVerifiedAuditContext } from "@/features/audit/server";
import {
  AccountAccessError,
  createServerVerifiedAccountTransactionRunner,
  type CurrentAccountDto,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import {
  isMediaPurposeAllowed,
  isOwnedMediaObjectPath,
} from "../../domain/media-upload-policy";
import type { MediaUploadRepository } from "../services/media-upload.service";

interface DrizzleMediaUploadRepositoryDependencies {
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createDrizzleMediaUploadRepository({
  runVerifiedAccountTransaction,
}: DrizzleMediaUploadRepositoryDependencies): MediaUploadRepository {
  return {
    async createPendingMedia(input) {
      return runVerifiedAccountTransaction(
        { requestId: input.requestId },
        async (transaction, context) => {
          const account: CurrentAccountDto = {
            id: context.accountId,
            role: context.role,
            status: context.status,
          };

          if (
            !isMediaPurposeAllowed(account, input.kind) ||
            !isOwnedMediaObjectPath({
              accountId: account.id,
              bucketName: input.bucketName,
              objectPath: input.objectPath,
              purpose: input.kind,
            })
          ) {
            throw new AccountAccessError("OWNERSHIP_FORBIDDEN");
          }

          await applyVerifiedAuditContext(transaction, {
            actorAccountId: account.id,
            actorRole: account.role,
            actorType: account.role === "ADMIN" ? "ADMIN" : "USER",
            reason: "Finalize validated private media upload",
            requestId: input.requestId,
            source: account.role === "ADMIN" ? "BACKOFFICE" : "APPLICATION",
          });

          const [createdAsset] = await transaction
            .insert(mediaAssets)
            .values({
              bucketName: input.bucketName,
              kind: input.kind,
              mimeType: input.mimeType,
              objectPath: input.objectPath,
              ownerAccountId: account.id,
              sizeBytes: input.sizeBytes,
              status: "PENDING",
            })
            .onConflictDoNothing({
              target: [mediaAssets.bucketName, mediaAssets.objectPath],
            })
            .returning({ id: mediaAssets.id });

          if (createdAsset) {
            return createdAsset;
          }

          const [existingAsset] = await transaction
            .select({
              bucketName: mediaAssets.bucketName,
              id: mediaAssets.id,
              kind: mediaAssets.kind,
              mimeType: mediaAssets.mimeType,
              objectPath: mediaAssets.objectPath,
              ownerAccountId: mediaAssets.ownerAccountId,
              sizeBytes: mediaAssets.sizeBytes,
            })
            .from(mediaAssets)
            .where(
              and(
                eq(mediaAssets.bucketName, input.bucketName),
                eq(mediaAssets.objectPath, input.objectPath),
              ),
            )
            .limit(1);

          if (
            !existingAsset ||
            existingAsset.ownerAccountId !== account.id ||
            existingAsset.kind !== input.kind ||
            existingAsset.mimeType !== input.mimeType ||
            existingAsset.sizeBytes !== input.sizeBytes
          ) {
            throw new Error(
              "Media object path conflicts with different metadata.",
            );
          }

          return { id: existingAsset.id };
        },
      );
    },
  };
}

export async function createServerMediaUploadRepository() {
  return createDrizzleMediaUploadRepository({
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
