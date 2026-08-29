import type { CurrentAccountDto } from "@/features/identity/server";

import type {
  MediaBucketName,
  MediaPurpose,
} from "../types/media-upload.types";

const purposeLocation: Readonly<
  Record<MediaPurpose, { bucketName: MediaBucketName; folder: string }>
> = {
  AVATAR: {
    bucketName: "profile-media",
    folder: "avatar",
  },
  COVER: {
    bucketName: "profile-media",
    folder: "cover",
  },
  LOGO: {
    bucketName: "profile-media",
    folder: "logo",
  },
  SPONSORSHIP_CREATIVE: {
    bucketName: "sponsorship-media",
    folder: "creative",
  },
};

const editableProfileStatuses = new Set([
  "ONBOARDING",
  "CHANGES_REQUESTED",
  "PENDING_REVIEW",
  "APPROVED",
]);

export function isMediaPurposeAllowed(
  account: CurrentAccountDto,
  purpose: MediaPurpose,
) {
  if (purpose === "SPONSORSHIP_CREATIVE") {
    return account.role === "ADMIN" && account.status === "APPROVED";
  }

  if (!editableProfileStatuses.has(account.status)) {
    return false;
  }

  if (account.role === "INFLUENCER") {
    return purpose === "AVATAR" || purpose === "COVER";
  }

  if (account.role === "COMPANY") {
    return purpose === "LOGO" || purpose === "COVER";
  }

  return false;
}

export function buildMediaObjectPath({
  accountId,
  extension,
  objectId,
  purpose,
}: {
  accountId: string;
  extension: string;
  objectId: string;
  purpose: MediaPurpose;
}) {
  const location = purposeLocation[purpose];

  return {
    bucketName: location.bucketName,
    objectPath: `${accountId}/${location.folder}/${objectId}.${extension}`,
  };
}

export function isOwnedMediaObjectPath({
  accountId,
  bucketName,
  objectPath,
  purpose,
}: {
  accountId: string;
  bucketName: MediaBucketName;
  objectPath: string;
  purpose: MediaPurpose;
}) {
  const location = purposeLocation[purpose];
  const expectedPrefix = `${accountId}/${location.folder}/`;
  const objectName = objectPath.slice(expectedPrefix.length);

  return (
    bucketName === location.bucketName &&
    objectPath.startsWith(expectedPrefix) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpe?g|png|webp)$/i.test(
      objectName,
    )
  );
}
