"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import {
  activateProfileMediaSchema,
  finalizeMediaUploadSchema,
  prepareMediaUploadSchema,
} from "../../schemas/media-upload.schemas";
import type {
  ActivateProfileMediaResult,
  FinalizeMediaUploadResult,
  PrepareMediaUploadResult,
} from "../../types/media-upload.types";
import { createServerProfileMediaReplacementService } from "../services/server-profile-media-replacement.service";
import { createServerMediaUploadService } from "../services/server-media-upload.service";

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

  try {
    const service = await createServerProfileMediaReplacementService();
    const result = await service.activateProfileMedia({
      ...parsed.data,
      requestId: crypto.randomUUID(),
    });

    if (result.kind === "activated") {
      revalidatePath("/app/profile");
    }

    return result;
  } catch {
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

  try {
    const service = await createServerMediaUploadService();

    return service.prepareUpload({
      ...parsed.data,
      requestId: crypto.randomUUID(),
    });
  } catch {
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

  try {
    const service = await createServerMediaUploadService();

    return service.finalizeUpload({
      ...parsed.data,
      requestId: crypto.randomUUID(),
    });
  } catch {
    return {
      code: "STORAGE_UNAVAILABLE",
      kind: "error",
    };
  }
}
