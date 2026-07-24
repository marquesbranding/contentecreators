import "server-only";

import type { SupportedImageMimeType } from "@/shared/lib/media/image-validation";

import type {
  MediaBucketName,
  SignedMediaDto,
} from "../../types/media-upload.types";

const signedMediaLifetimeSeconds = 300;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AuthorizedMediaRecord {
  bucketName: MediaBucketName;
  height: number | null;
  id: string;
  mimeType: SupportedImageMimeType;
  objectPath: string;
  width: number | null;
}

export interface SignedMediaRepository {
  findAuthorizedActiveMedia(
    assetId: string,
    requestId: string,
  ): Promise<AuthorizedMediaRecord | null>;
}

export interface SignedMediaStorageGateway {
  createSignedDownload(input: {
    bucketName: MediaBucketName;
    expiresInSeconds: number;
    objectPath: string;
  }): Promise<{ signedUrl: string } | null>;
}

interface SignedMediaServiceDependencies {
  now(): Date;
  repository: SignedMediaRepository;
  storage: SignedMediaStorageGateway;
}

export function createSignedMediaService({
  now,
  repository,
  storage,
}: SignedMediaServiceDependencies) {
  return {
    async getSignedMedia(
      assetId: string,
      requestId = crypto.randomUUID(),
    ): Promise<SignedMediaDto | null> {
      if (!uuidPattern.test(assetId)) {
        return null;
      }

      const media = await repository.findAuthorizedActiveMedia(
        assetId,
        requestId,
      );

      if (!media) {
        return null;
      }

      const signedDownload = await storage.createSignedDownload({
        bucketName: media.bucketName,
        expiresInSeconds: signedMediaLifetimeSeconds,
        objectPath: media.objectPath,
      });

      if (!signedDownload) {
        return null;
      }

      return {
        expiresAt: new Date(
          now().getTime() + signedMediaLifetimeSeconds * 1000,
        ).toISOString(),
        height: media.height,
        id: media.id,
        mimeType: media.mimeType,
        url: signedDownload.signedUrl,
        width: media.width,
      };
    },
  };
}
