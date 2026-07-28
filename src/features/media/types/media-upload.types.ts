import type {
  ImageUploadPurpose,
  SupportedImageMimeType,
} from "@/shared/lib/media/image-validation";

export type MediaPurpose = ImageUploadPurpose;
export type ProfileMediaPurpose = Exclude<MediaPurpose, "SPONSORSHIP_CREATIVE">;
export type MediaBucketName = "profile-media" | "sponsorship-media";

export interface PrepareMediaUploadInput {
  declaredMimeType: string;
  fileName: string;
  purpose: MediaPurpose;
  sizeBytes: number;
}

export interface FinalizeMediaUploadInput {
  bucketName: MediaBucketName;
  objectPath: string;
  purpose: MediaPurpose;
}

export type MediaUploadErrorCode =
  | "ACCESS_DENIED"
  | "EMPTY_FILE"
  | "EXTENSION_MISMATCH"
  | "FILE_TOO_LARGE"
  | "INVALID_IMAGE_DIMENSIONS"
  | "INVALID_INPUT"
  | "MEDIA_ASSET_NOT_FOUND"
  | "MEDIA_REPLACEMENT_CONFLICT"
  | "MIME_SIGNATURE_MISMATCH"
  | "OBJECT_NOT_FOUND"
  | "OBJECT_PATH_INVALID"
  | "STORAGE_UNAVAILABLE"
  | "UNSUPPORTED_DECLARED_MIME"
  | "UNSUPPORTED_EXTENSION"
  | "UNSUPPORTED_IMAGE_SIGNATURE";

export type PrepareMediaUploadResult =
  | {
      kind: "prepared";
      upload: {
        bucketName: MediaBucketName;
        objectPath: string;
        token: string;
      };
    }
  | {
      code: MediaUploadErrorCode;
      kind: "error";
    };

export type FinalizeMediaUploadResult =
  | {
      asset: {
        id: string;
        status: "PENDING";
      };
      kind: "finalized";
    }
  | {
      code: MediaUploadErrorCode;
      kind: "error";
    };

export interface PendingMediaMetadata {
  bucketName: MediaBucketName;
  height: number;
  kind: MediaPurpose;
  mimeType: SupportedImageMimeType;
  objectPath: string;
  requestId: string;
  sizeBytes: number;
  width: number;
}

export interface ActivateProfileMediaInput {
  assetId: string;
  expectedCurrentAssetId: string | null;
  purpose: ProfileMediaPurpose;
}

export type ActivateProfileMediaResult =
  | {
      asset: {
        id: string;
        status: "ACTIVE";
      };
      kind: "activated";
      profileVersion: number;
      replacedAssetId: string | null;
    }
  | {
      code:
        | "ACCESS_DENIED"
        | "INVALID_INPUT"
        | "MEDIA_ASSET_NOT_FOUND"
        | "MEDIA_REPLACEMENT_CONFLICT"
        | "STORAGE_UNAVAILABLE";
      kind: "error";
    };

export interface SignedMediaDto {
  expiresAt: string;
  height: number | null;
  id: string;
  mimeType: SupportedImageMimeType;
  url: string;
  width: number | null;
}

export type PrepareMediaUploadAction = (
  input: PrepareMediaUploadInput,
) => Promise<PrepareMediaUploadResult>;

export type FinalizeMediaUploadAction = (
  input: FinalizeMediaUploadInput,
) => Promise<FinalizeMediaUploadResult>;

export type ActivateProfileMediaAction = (
  input: ActivateProfileMediaInput,
) => Promise<ActivateProfileMediaResult>;

export interface MediaUploadActions {
  activate?: ActivateProfileMediaAction;
  finalize: FinalizeMediaUploadAction;
  prepare: PrepareMediaUploadAction;
}

export interface InfluencerMediaFormState {
  avatarAssetId: string | null;
  coverAssetId: string | null;
  profileExists: boolean;
}

export interface CompanyMediaFormState {
  coverAssetId: string | null;
  logoAssetId: string | null;
  profileExists: boolean;
}
