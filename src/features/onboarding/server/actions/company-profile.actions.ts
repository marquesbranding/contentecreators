"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { toUserFacingError } from "@/shared/lib/errors/user-facing-error";
import { logUserFacingError } from "@/shared/server/errors/log-user-facing-error";

import { readAdditionalCompanyLocations } from "../../domain/company-location-form-data";
import { readSocialChannels } from "../../domain/social-channels-form-data";
import { companyProfileEditSchema } from "../../schemas/company-profile-edit-schema";
import type { CompanyProfileActionState } from "../../types/company-profile.types";
import { createServerCompanyProfileService } from "../services/server-company-profile.service";

function companyProfileFormPayload(formData: FormData) {
  return {
    additionalLocations: readAdditionalCompanyLocations(formData),
    city: formData.get("city"),
    cnpj: formData.get("cnpj"),
    complement: formData.get("complement"),
    description: formData.get("description"),
    employeeRange: formData.get("employeeRange"),
    expectedVersion: formData.get("expectedVersion"),
    isCdlMember: formData.get("isCdlMember"),
    legalName: formData.get("legalName"),
    neighborhood: formData.get("neighborhood"),
    number: formData.get("number"),
    postalCode: formData.get("postalCode"),
    segment: formData.get("segment"),
    socialChannels: readSocialChannels(formData),
    state: formData.get("state"),
    street: formData.get("street"),
    tradeName: formData.get("tradeName"),
    websiteUrl: formData.get("websiteUrl"),
    whatsapp: formData.get("whatsapp"),
  };
}

export async function updateCompanyProfileAction(
  _previousState: CompanyProfileActionState,
  formData: FormData,
): Promise<CompanyProfileActionState> {
  const parsed = companyProfileEditSchema.safeParse(
    companyProfileFormPayload(formData),
  );

  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors).filter(
        (entry): entry is [string, string[]] => Boolean(entry[1]?.length),
      ),
    );

    return {
      fieldErrors,
      message: "Revise os campos destacados para salvar sua empresa.",
      status: "error",
    };
  }

  const requestId = crypto.randomUUID();

  try {
    const service = await createServerCompanyProfileService();
    const result = await service.updateOwnerProfile({
      input: parsed.data,
      requestId,
    });

    if (result.kind === "conflict") {
      return {
        message:
          "O perfil da empresa foi atualizado em outra aba. Recarregue a página antes de tentar novamente.",
        profileVersion: result.currentVersion,
        status: "error",
      };
    }

    revalidatePath("/app/profile");
    return {
      message: "Perfil da empresa atualizado com sucesso.",
      profileVersion: result.profile.version,
      status: "success",
    };
  } catch (error) {
    const context = {
      operation: "save_profile" as const,
      requestId,
      role: "COMPANY" as const,
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
