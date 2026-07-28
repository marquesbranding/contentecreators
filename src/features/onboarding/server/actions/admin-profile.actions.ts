"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { readAdditionalCompanyLocations } from "../../domain/company-location-form-data";
import { companyProfileEditSchema } from "../../schemas/company-profile-edit-schema";
import { influencerProfileEditSchema } from "../../schemas/influencer-profile-edit-schema";
import type { CompanyProfileActionState } from "../../types/company-profile.types";
import type { InfluencerProfileActionState } from "../../types/influencer-profile.types";
import { createServerAdminProfileEditService } from "../services/server-admin-profile-edit.service";

const adminProfileCommandSchema = z.object({
  accountId: z.uuid("O cadastro informado não é válido."),
  reason: z
    .string()
    .trim()
    .min(10, "Explique o motivo da alteração administrativa.")
    .max(1000, "O motivo deve ter no máximo 1.000 caracteres."),
});

function influencerProfilePayload(formData: FormData) {
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
    socialPlatform: formData.get("socialPlatform"),
    socialUrl: formData.get("socialUrl"),
    state: formData.get("state"),
    whatsapp: formData.get("whatsapp"),
  };
}

function companyProfilePayload(formData: FormData) {
  return {
    additionalLocations: readAdditionalCompanyLocations(formData),
    city: formData.get("city"),
    cnpj: formData.get("cnpj"),
    complement: formData.get("complement"),
    description: formData.get("description"),
    employeeRange: formData.get("employeeRange"),
    expectedVersion: formData.get("expectedVersion"),
    legalName: formData.get("legalName"),
    neighborhood: formData.get("neighborhood"),
    number: formData.get("number"),
    postalCode: formData.get("postalCode"),
    segment: formData.get("segment"),
    socialPlatform: formData.get("socialPlatform"),
    socialUrl: formData.get("socialUrl"),
    state: formData.get("state"),
    street: formData.get("street"),
    tradeName: formData.get("tradeName"),
    websiteUrl: formData.get("websiteUrl"),
    whatsapp: formData.get("whatsapp"),
  };
}

function fieldErrors(errors: z.ZodError): Record<string, string[]> | undefined {
  const flattened = errors.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const entries = Object.entries(flattened).filter(
    (entry): entry is [string, string[]] => Boolean(entry[1]?.length),
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function mergeFieldErrors(
  ...errors: Array<Record<string, string[]> | undefined>
) {
  return Object.assign({}, ...errors.filter(Boolean)) as Record<
    string,
    string[]
  >;
}

function commandPayload(accountId: string, formData: FormData) {
  return {
    accountId,
    reason: formData.get("reason"),
  };
}

function revalidateAdminProfile(accountId: string) {
  revalidatePath(`/backoffice/accounts/${accountId}`);
  revalidatePath(`/backoffice/accounts/${accountId}/edit`);
}

export async function updateInfluencerProfileAsAdminAction(
  accountId: string,
  _previousState: InfluencerProfileActionState,
  formData: FormData,
): Promise<InfluencerProfileActionState> {
  const profile = influencerProfileEditSchema.safeParse(
    influencerProfilePayload(formData),
  );
  const command = adminProfileCommandSchema.safeParse(
    commandPayload(accountId, formData),
  );

  if (!profile.success || !command.success) {
    return {
      fieldErrors: mergeFieldErrors(
        profile.success ? undefined : fieldErrors(profile.error),
        command.success ? undefined : fieldErrors(command.error),
      ),
      message: "Revise os campos destacados para salvar este perfil.",
      status: "error",
    };
  }

  try {
    const service = await createServerAdminProfileEditService();
    const result = await service.updateInfluencerProfile({
      accountId: command.data.accountId,
      input: profile.data,
      reason: command.data.reason,
      requestId: crypto.randomUUID(),
    });

    if (result.kind === "conflict") {
      return {
        message:
          "Este perfil mudou desde a abertura da página. Recarregue antes de tentar novamente.",
        profileVersion: result.currentVersion,
        status: "error",
      };
    }

    revalidateAdminProfile(accountId);
    return {
      message: "Perfil do creator atualizado com sucesso.",
      profileVersion: result.profile.version,
      status: "success",
    };
  } catch {
    return {
      message: "Não foi possível atualizar este perfil. Tente novamente.",
      status: "error",
    };
  }
}

export async function updateCompanyProfileAsAdminAction(
  accountId: string,
  _previousState: CompanyProfileActionState,
  formData: FormData,
): Promise<CompanyProfileActionState> {
  const profile = companyProfileEditSchema.safeParse(
    companyProfilePayload(formData),
  );
  const command = adminProfileCommandSchema.safeParse(
    commandPayload(accountId, formData),
  );

  if (!profile.success || !command.success) {
    return {
      fieldErrors: mergeFieldErrors(
        profile.success ? undefined : fieldErrors(profile.error),
        command.success ? undefined : fieldErrors(command.error),
      ),
      message: "Revise os campos destacados para salvar este perfil.",
      status: "error",
    };
  }

  try {
    const service = await createServerAdminProfileEditService();
    const result = await service.updateCompanyProfile({
      accountId: command.data.accountId,
      input: profile.data,
      reason: command.data.reason,
      requestId: crypto.randomUUID(),
    });

    if (result.kind === "conflict") {
      return {
        message:
          "Este perfil mudou desde a abertura da página. Recarregue antes de tentar novamente.",
        profileVersion: result.currentVersion,
        status: "error",
      };
    }

    revalidateAdminProfile(accountId);
    return {
      message: "Perfil da empresa atualizado com sucesso.",
      profileVersion: result.profile.version,
      status: "success",
    };
  } catch {
    return {
      message: "Não foi possível atualizar este perfil. Tente novamente.",
      status: "error",
    };
  }
}
