"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { operationalLogger } from "@/shared/server/observability/operational-logger";

import {
  activateProfileMediaSchema,
  finalizeMediaUploadSchema,
  prepareMediaUploadSchema,
  removeProfileMediaSchema,
} from "../../schemas/media-upload.schemas";
import type {
  ActivateProfileMediaResult,
  FinalizeMediaUploadResult,
  PrepareMediaUploadResult,
  RemoveProfileMediaResult,
} from "../../types/media-upload.types";
import { createServerProfileMediaReplacementService } from "../services/server-profile-media-replacement.service";
import { createServerMediaUploadService } from "../services/server-media-upload.service";

function logStorageFailure(
  operation: string,
  requestId: string,
  error: unknown,
) {
  operationalLogger.error({
    details: {
      errorMessage: error instanceof Error ? error.message : String(error),
    },
    event: "user_facing_error",
    operation,
    outcome: "error",
    requestId,
  });
}

export async function activateProfileMediaAction(
  input: unknown,
): Promise<ActivateProfileMediaResult> {
  const parsed = activateProfileMediaSchema.safeParse(input);

  if (!parsed.success) {
    return {
      code: "INVALID_INPUT",
      kind: "error",
    };
  }

  const requestId = crypto.randomUUID();

  try {
    const service = await createServerProfileMediaReplacementService();
    const result = await service.activateProfileMedia({
      ...parsed.data,
      requestId,
    });

    if (result.kind === "activated") {
      revalidatePath("/app/profile");
    }

    return result;
  } catch (error) {
    logStorageFailure("activate_profile_media", requestId, error);

    return {
      code: "STORAGE_UNAVAILABLE",
      kind: "error",
    };
  }
}

export async function removeProfileMediaAction(
  input: unknown,
): Promise<RemoveProfileMediaResult> {
  const parsed = removeProfileMediaSchema.safeParse(input);

  if (!parsed.success) {
    return {
      code: "INVALID_INPUT",
      kind: "error",
    };
  }

  const requestId = crypto.randomUUID();

  try {
    const service = await createServerProfileMediaReplacementService();
    const result = await service.removeProfileMedia({
      ...parsed.data,
      requestId,
    });

    if (result.kind === "removed") {
      revalidatePath("/app/profile");
    }

    return result;
  } catch (error) {
    logStorageFailure("remove_profile_media", requestId, error);

    return {
      code: "STORAGE_UNAVAILABLE",
      kind: "error",
    };
  }
}

export async function prepareMediaUploadAction(
  input: unknown,
): Promise<PrepareMediaUploadResult> {
  const parsed = prepareMediaUploadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      code: "INVALID_INPUT",
      kind: "error",
    };
  }

  const requestId = crypto.randomUUID();

  try {
    const service = await createServerMediaUploadService();

    return await service.prepareUpload({
      ...parsed.data,
      requestId,
    });
  } catch (error) {
    logStorageFailure("prepare_media_upload", requestId, error);

    return {
      code: "STORAGE_UNAVAILABLE",
      kind: "error",
    };
  }
}

export async function finalizeMediaUploadAction(
  input: unknown,
): Promise<FinalizeMediaUploadResult> {
  const parsed = finalizeMediaUploadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      code: "INVALID_INPUT",
      kind: "error",
    };
  }

  const requestId = crypto.randomUUID();

  try {
    const service = await createServerMediaUploadService();

    return await service.finalizeUpload({
      ...parsed.data,
      requestId,
    });
  } catch (error) {
    logStorageFailure("finalize_media_upload", requestId, error);

    return {
      code: "STORAGE_UNAVAILABLE",
      kind: "error",
    };
  }
}
