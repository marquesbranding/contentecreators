"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { toUserFacingError } from "@/shared/lib/errors/user-facing-error";
import { logUserFacingError } from "@/shared/server/errors/log-user-facing-error";

import { readSocialChannels } from "../../domain/social-channels-form-data";
import { influencerProfileEditSchema } from "../../schemas/influencer-profile-edit-schema";
import type { InfluencerProfileActionState } from "../../types/influencer-profile.types";
import { createServerInfluencerProfileService } from "../services/server-influencer-profile.service";

function profileFormPayload(formData: FormData) {
  return {
    bio: formData.get("bio"),
    city: formData.get("city"),
    creatorType: formData.get("creatorType"),
    displayName: formData.get("displayName"),
    expectedVersion: formData.get("expectedVersion"),
    isCdlMember: formData.get("isCdlMember"),
    legalName: formData.get("legalName"),
    nicheSlugs: formData.getAll("nicheSlugs"),
    otherNiche: formData.get("otherNiche"),
    socialChannels: readSocialChannels(formData),
    state: formData.get("state"),
    whatsapp: formData.get("whatsapp"),
  };
}

export async function updateInfluencerProfileAction(
  _previousState: InfluencerProfileActionState,
  formData: FormData,
): Promise<InfluencerProfileActionState> {
  const parsed = influencerProfileEditSchema.safeParse(
    profileFormPayload(formData),
  );

  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors).filter(
        (entry): entry is [string, string[]] => Boolean(entry[1]?.length),
      ),
    );

    return {
      fieldErrors,
      message: "Revise os campos destacados para salvar seu perfil.",
      status: "error",
    };
  }

  const requestId = crypto.randomUUID();

  try {
    const service = await createServerInfluencerProfileService();
    const result = await service.updateOwnerProfile({
      input: parsed.data,
      requestId,
    });

    if (result.kind === "conflict") {
      return {
        message:
          "Seu perfil foi atualizado em outra aba. Recarregue a página antes de tentar novamente.",
        profileVersion: result.currentVersion,
        status: "error",
      };
    }

    revalidatePath("/app/profile");
    return {
      message: "Perfil atualizado com sucesso.",
      profileVersion: result.profile.version,
      status: "success",
    };
  } catch (error) {
    const context = {
      operation: "save_profile" as const,
      requestId,
      role: "INFLUENCER" as const,
    };
    const mapped = toUserFacingError(error, context);
    logUserFacingError(error, mapped, context);

    return {
      errorCode: mapped.code,
      fieldErrors: mapped.fieldErrors,
      message: mapped.message,
      requestId,
      retryable: mapped.retryable,
      status: "error",
      title: mapped.title,
    };
  }
}
