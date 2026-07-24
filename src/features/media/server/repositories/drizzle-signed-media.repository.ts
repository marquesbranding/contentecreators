import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { mediaAssets } from "@/db/schema";
import {
  createServerVerifiedAccountTransactionRunner,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";
import type { SupportedImageMimeType } from "@/shared/lib/media/image-validation";

import type {
  AuthorizedMediaRecord,
  SignedMediaRepository,
} from "../services/signed-media.service";

interface DrizzleSignedMediaRepositoryDependencies {
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

function isSupportedImageMimeType(
  value: string,
): value is SupportedImageMimeType {
  return (
    value === "image/jpeg" || value === "image/png" || value === "image/webp"
  );
}

export function createDrizzleSignedMediaRepository({
  runVerifiedAccountTransaction,
}: DrizzleSignedMediaRepositoryDependencies): SignedMediaRepository {
  return {
    async findAuthorizedActiveMedia(assetId, requestId) {
      return runVerifiedAccountTransaction(
        { requestId },
        async (transaction, context) => {
          const [media] = await transaction
            .select({
              bucketName: mediaAssets.bucketName,
              height: mediaAssets.height,
              id: mediaAssets.id,
              mimeType: mediaAssets.mimeType,
              objectPath: mediaAssets.objectPath,
              ownerAccountId: mediaAssets.ownerAccountId,
              width: mediaAssets.width,
            })
            .from(mediaAssets)
            .where(
              and(
                eq(mediaAssets.id, assetId),
                eq(mediaAssets.status, "ACTIVE"),
                isNull(mediaAssets.archivedAt),
              ),
            )
            .limit(1);

          if (!media || !isSupportedImageMimeType(media.mimeType)) {
            return null;
          }

          const ownsMedia = media.ownerAccountId === context.accountId;
          const canReadOwnMedia =
            ownsMedia &&
            context.status !== "SUSPENDED" &&
            context.status !== "BANNED";
          const canReadAuthorizedMedia = context.status === "APPROVED";

          if (!canReadOwnMedia && !canReadAuthorizedMedia) {
            return null;
          }

          return {
            bucketName: media.bucketName as AuthorizedMediaRecord["bucketName"],
            height: media.height,
            id: media.id,
            mimeType: media.mimeType,
            objectPath: media.objectPath,
            width: media.width,
          };
        },
      );
    },
  };
}

export async function createServerSignedMediaRepository() {
  return createDrizzleSignedMediaRepository({
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
