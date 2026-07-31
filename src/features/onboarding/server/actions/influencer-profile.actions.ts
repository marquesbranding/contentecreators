"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { influencerProfileEditSchema } from "../../schemas/influencer-profile-edit-schema";
import type { InfluencerProfileActionState } from "../../types/influencer-profile.types";
import { createServerInfluencerProfileService } from "../services/server-influencer-profile.service";

function profileFormPayload(formData: FormData) {
  return {
    bio: formData.get("bio"),
    city: formData.get("city"),
    creatorType: formData.get("creatorType"),
    displayName: formData.get("displayName"),
    engagementRate: formData.get("engagementRate"),
    expectedVersion: formData.get("expectedVersion"),
    followers: formData.get("followers"),
    legalName: formData.get("legalName"),
    nicheSlugs: formData.getAll("nicheSlugs"),
    otherNiche: formData.get("otherNiche"),
    socialPlatform: formData.get("socialPlatform"),
    socialUrl: formData.get("socialUrl"),
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

  try {
    const service = await createServerInfluencerProfileService();
    const result = await service.updateOwnerProfile({
      input: parsed.data,
      requestId: crypto.randomUUID(),
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
  } catch {
    return {
      message: "Não foi possível atualizar seu perfil. Tente novamente.",
      status: "error",
    };
  }
}
