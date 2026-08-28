import "server-only";

import {
  AccountAccessError,
  requireAccount,
  type CurrentSessionDto,
} from "@/features/identity/server";

import { isMediaPurposeAllowed } from "../../domain/media-upload-policy";
import type {
  ActivateProfileMediaResult,
  ProfileMediaPurpose,
  RemoveProfileMediaResult,
} from "../../types/media-upload.types";

type ActivateProfileMediaRepositoryResult =
  | {
      assetId: string;
      kind: "activated";
      profileVersion: number;
      replacedAssetId: string | null;
    }
  | {
      kind: "conflict";
    }
  | {
      kind: "not_found";
    };

type RemoveProfileMediaRepositoryResult =
  | {
      kind: "removed";
      profileVersion: number;
    }
  | {
      kind: "not_found";
    };

export interface ProfileMediaReplacementRepository {
  activateProfileMedia(input: {
    assetId: string;
    expectedCurrentAssetId: string | null;
    purpose: ProfileMediaPurpose;
    requestId: string;
  }): Promise<ActivateProfileMediaRepositoryResult>;
  removeProfileMedia(input: {
    purpose: ProfileMediaPurpose;
    requestId: string;
  }): Promise<RemoveProfileMediaRepositoryResult>;
}

interface ProfileMediaReplacementDependencies {
  repository: ProfileMediaReplacementRepository;
  resolveCurrentSession(requestId: string): Promise<CurrentSessionDto>;
}

export function createProfileMediaReplacementService({
  repository,
  resolveCurrentSession,
}: ProfileMediaReplacementDependencies) {
  return {
    async activateProfileMedia(input: {
      assetId: string;
      expectedCurrentAssetId: string | null;
      purpose: ProfileMediaPurpose | "SPONSORSHIP_CREATIVE";
      requestId: string;
    }): Promise<ActivateProfileMediaResult> {
      try {
        const session = await resolveCurrentSession(input.requestId);
        const account = requireAccount(session);

        if (
          input.purpose === "SPONSORSHIP_CREATIVE" ||
          !isMediaPurposeAllowed(account, input.purpose)
        ) {
          return {
            code: "ACCESS_DENIED",
            kind: "error",
          };
        }

        const result = await repository.activateProfileMedia({
          ...input,
          purpose: input.purpose,
        });

        if (result.kind === "conflict") {
          return {
            code: "MEDIA_REPLACEMENT_CONFLICT",
            kind: "error",
          };
        }

        if (result.kind === "not_found") {
          return {
            code: "MEDIA_ASSET_NOT_FOUND",
            kind: "error",
          };
        }

        return {
          asset: {
            id: result.assetId,
            status: "ACTIVE",
          },
          kind: "activated",
          profileVersion: result.profileVersion,
          replacedAssetId: result.replacedAssetId,
        };
      } catch (error) {
        if (error instanceof AccountAccessError) {
          return {
            code: "ACCESS_DENIED",
            kind: "error",
          };
        }

        throw error;
      }
    },

    async removeProfileMedia(input: {
      purpose: ProfileMediaPurpose;
      requestId: string;
    }): Promise<RemoveProfileMediaResult> {
      try {
        const session = await resolveCurrentSession(input.requestId);
        const account = requireAccount(session);

        if (!isMediaPurposeAllowed(account, input.purpose)) {
          return {
            code: "ACCESS_DENIED",
            kind: "error",
          };
        }

        const result = await repository.removeProfileMedia(input);

        if (result.kind === "not_found") {
          return {
            code: "ACCESS_DENIED",
            kind: "error",
          };
        }

        return {
          kind: "removed",
          profileVersion: result.profileVersion,
        };
      } catch (error) {
        if (error instanceof AccountAccessError) {
          return {
            code: "ACCESS_DENIED",
            kind: "error",
          };
        }

        throw error;
      }
    },
  };
}
