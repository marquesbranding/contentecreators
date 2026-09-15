"use server";
import {
  prepareMediaUploadSchema,
  finalizeMediaUploadSchema,
} from "../../schemas/media-upload.schemas";
import type {
  PrepareMediaUploadResult,
  FinalizeMediaUploadResult,
} from "../../types/media-upload.types";
import { createRegistrationMediaService } from "../services/registration-media.service";

export async function prepareRegistrationMediaAction(
  input: unknown,
): Promise<PrepareMediaUploadResult> {
  const parsed = prepareMediaUploadSchema.safeParse(input);
  if (!parsed.success || !["AVATAR", "COVER"].includes(parsed.data.purpose))
    return { kind: "error", code: "INVALID_INPUT" };
  const service = await createRegistrationMediaService();
  try {
    return await service.prepareUpload({
      ...parsed.data,
      requestId: crypto.randomUUID(),
    });
  } catch {
    return { kind: "error", code: "STORAGE_UNAVAILABLE" };
  }
}
export async function finalizeRegistrationMediaAction(
  input: unknown,
): Promise<FinalizeMediaUploadResult> {
  const parsed = finalizeMediaUploadSchema.safeParse(input);
  if (!parsed.success || !["AVATAR", "COVER"].includes(parsed.data.purpose))
    return { kind: "error", code: "INVALID_INPUT" };
  const service = await createRegistrationMediaService();
  try {
    return await service.finalizeUpload({
      ...parsed.data,
      requestId: crypto.randomUUID(),
    });
  } catch {
    return { kind: "error", code: "STORAGE_UNAVAILABLE" };
  }
}
