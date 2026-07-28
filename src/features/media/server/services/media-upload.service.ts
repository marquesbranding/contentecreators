import "server-only";

import {
  AccountAccessError,
  requireAccount,
  type CurrentSessionDto,
} from "@/features/identity/server";
import {
  extractImageDimensions,
  validateImageUpload,
  validateImageUploadDeclaration,
} from "@/shared/lib/media/image-validation";

import {
  buildMediaObjectPath,
  isMediaPurposeAllowed,
  isOwnedMediaObjectPath,
} from "../../domain/media-upload-policy";
import type {
  FinalizeMediaUploadResult,
  MediaBucketName,
  MediaUploadErrorCode,
  PendingMediaMetadata,
  PrepareMediaUploadResult,
} from "../../types/media-upload.types";

export interface MediaStorageGateway {
  createSignedUpload(input: {
    bucketName: MediaBucketName;
    objectPath: string;
    upsert: false;
  }): Promise<{ token: string } | null>;
  inspectObject(input: {
    bucketName: MediaBucketName;
    objectPath: string;
  }): Promise<{
    contentType: string;
    headerBytes: Uint8Array;
    sizeBytes: number;
  } | null>;
}

export interface MediaUploadRepository {
  createPendingMedia(input: PendingMediaMetadata): Promise<{ id: string }>;
}

interface MediaUploadServiceDependencies {
  createObjectId(): string;
  repository: MediaUploadRepository;
  resolveCurrentSession(requestId: string): Promise<CurrentSessionDto>;
  storage: MediaStorageGateway;
}

type PrepareServiceInput = {
  declaredMimeType: string;
  fileName: string;
  purpose: PendingMediaMetadata["kind"];
  requestId: string;
  sizeBytes: number;
};

type FinalizeServiceInput = Pick<
  PendingMediaMetadata,
  "bucketName" | "objectPath" | "requestId"
> & {
  purpose: PendingMediaMetadata["kind"];
};

function errorResult(code: MediaUploadErrorCode) {
  return {
    code,
    kind: "error" as const,
  };
}

export function createMediaUploadService({
  createObjectId,
  repository,
  resolveCurrentSession,
  storage,
}: MediaUploadServiceDependencies) {
  async function resolveAuthorizedAccount(
    requestId: string,
    purpose: PendingMediaMetadata["kind"],
  ) {
    const session = await resolveCurrentSession(requestId);
    const account = requireAccount(session);

    if (!isMediaPurposeAllowed(account, purpose)) {
      throw new AccountAccessError("ROLE_FORBIDDEN");
    }

    return account;
  }

  return {
    async prepareUpload(
      input: PrepareServiceInput,
    ): Promise<PrepareMediaUploadResult> {
      const declaration = validateImageUploadDeclaration(input);

      if (!declaration.ok) {
        return errorResult(declaration.code);
      }

      try {
        const account = await resolveAuthorizedAccount(
          input.requestId,
          input.purpose,
        );
        const location = buildMediaObjectPath({
          accountId: account.id,
          extension: declaration.value.extension,
          objectId: createObjectId(),
          purpose: input.purpose,
        });
        const upload = await storage.createSignedUpload({
          ...location,
          upsert: false,
        });

        return upload
          ? {
              kind: "prepared",
              upload: {
                ...location,
                token: upload.token,
              },
            }
          : errorResult("STORAGE_UNAVAILABLE");
      } catch (error) {
        if (error instanceof AccountAccessError) {
          return errorResult("ACCESS_DENIED");
        }

        throw error;
      }
    },

    async finalizeUpload(
      input: FinalizeServiceInput,
    ): Promise<FinalizeMediaUploadResult> {
      try {
        const account = await resolveAuthorizedAccount(
          input.requestId,
          input.purpose,
        );

        if (
          !isOwnedMediaObjectPath({
            accountId: account.id,
            bucketName: input.bucketName,
            objectPath: input.objectPath,
            purpose: input.purpose,
          })
        ) {
          return errorResult("OBJECT_PATH_INVALID");
        }

        const storedObject = await storage.inspectObject({
          bucketName: input.bucketName,
          objectPath: input.objectPath,
        });

        if (!storedObject) {
          return errorResult("OBJECT_NOT_FOUND");
        }

        const validation = validateImageUpload({
          declaredMimeType: storedObject.contentType,
          fileName: input.objectPath,
          headerBytes: storedObject.headerBytes,
          purpose: input.purpose,
          sizeBytes: storedObject.sizeBytes,
        });

        if (!validation.ok) {
          return errorResult(validation.code);
        }

        const dimensions = extractImageDimensions(
          storedObject.headerBytes,
          validation.value.mimeType,
        );

        if (!dimensions) {
          return errorResult("INVALID_IMAGE_DIMENSIONS");
        }

        const asset = await repository.createPendingMedia({
          bucketName: input.bucketName,
          height: dimensions.height,
          kind: input.purpose,
          mimeType: validation.value.mimeType,
          objectPath: input.objectPath,
          requestId: input.requestId,
          sizeBytes: validation.value.sizeBytes,
          width: dimensions.width,
        });

        return {
          asset: {
            id: asset.id,
            status: "PENDING",
          },
          kind: "finalized",
        };
      } catch (error) {
        if (error instanceof AccountAccessError) {
          return errorResult("ACCESS_DENIED");
        }

        throw error;
      }
    },
  };
}
