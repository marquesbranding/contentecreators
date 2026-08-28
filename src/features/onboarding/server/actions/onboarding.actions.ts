"use server";

import "server-only";

import { redirect } from "next/navigation";

import { getPublicEnv } from "@/shared/lib/env/public-env";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import { readAdditionalCompanyLocations } from "../../domain/company-location-form-data";
import { readSocialChannels } from "../../domain/social-channels-form-data";
import { correctedProfileResubmissionCommandSchema } from "../../schemas/corrected-profile-resubmission-schema";
import {
  emailRegistrationSchema,
  googleProfileSchema,
} from "../../schemas/onboarding-form-schema";
import type { OnboardingActionState } from "../../types/onboarding-action.types";
import { createServerCorrectedProfileResubmissionService } from "../services/server-corrected-profile-resubmission.service";
import { createServerOnboardingRegistrationService } from "../services/server-onboarding-registration.service";

function formPayload(formData: FormData) {
  return {
    additionalLocations: readAdditionalCompanyLocations(formData),
    avatarAssetId: formData.get("avatarAssetId") || undefined,
    bio: formData.get("bio"),
    city: formData.get("city"),
    cnpj: formData.get("cnpj"),
    complement: formData.get("complement"),
    contactVisibilityAccepted: formData.get("contactVisibilityAccepted"),
    coverAssetId: formData.get("coverAssetId") || undefined,
    creatorType: formData.get("creatorType"),
    description: formData.get("description"),
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    employeeRange: formData.get("employeeRange"),
    legalName: formData.get("legalName"),
    logoAssetId: formData.get("logoAssetId") || undefined,
    neighborhood: formData.get("neighborhood"),
    nicheSlugs: formData.getAll("nicheSlugs"),
    otherNiche: formData.get("otherNiche"),
    number: formData.get("number"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
    postalCode: formData.get("postalCode"),
    privacyAccepted: formData.get("privacyAccepted"),
    role: formData.get("role"),
    segment: formData.get("segment"),
    socialChannels: readSocialChannels(formData),
    socialPlatform: formData.get("socialPlatform"),
    socialUrl: formData.get("socialUrl"),
    state: formData.get("state"),
    street: formData.get("street"),
    termsAccepted: formData.get("termsAccepted"),
    tradeName: formData.get("tradeName"),
    websiteUrl: formData.get("websiteUrl"),
    whatsapp: formData.get("whatsapp"),
  };
}

function validationFailure(
  error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } },
  formData: FormData,
): OnboardingActionState {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Boolean(entry[1]?.length),
    ),
  );
  const rawRole = formData.get("role");

  return {
    fieldErrors,
    message: "Revise os campos destacados para continuar.",
    status: "error",
    values: {
      email: String(formData.get("email") ?? ""),
      role:
        rawRole === "COMPANY" || rawRole === "INFLUENCER" ? rawRole : undefined,
    },
  };
}

export async function registerWithEmailAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsed = emailRegistrationSchema.safeParse(formPayload(formData));

  if (!parsed.success) {
    return validationFailure(parsed.error, formData);
  }

  const service = await createServerOnboardingRegistrationService();
  const result = await service.registerWithEmail(parsed.data);

  if (result.kind === "redirect") {
    redirect(result.destination);
  }

  return {
    errorCode:
      result.kind === "account_exists" ? "account_already_exists" : undefined,
    message: result.message,
    status:
      result.kind === "confirmation_required"
        ? "confirmation_required"
        : "error",
    values: { email: parsed.data.email, role: parsed.data.role },
  };
}

export async function submitGoogleProfileAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsed = googleProfileSchema.safeParse(formPayload(formData));

  if (!parsed.success) {
    return validationFailure(parsed.error, formData);
  }

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user?.email) {
    redirect("/login?next=%2Fonboarding%2Frole");
  }

  const rawIdempotencyKey = formData.get("resubmissionIdempotencyKey");
  if (rawIdempotencyKey) {
    const command = correctedProfileResubmissionCommandSchema.safeParse({
      expectedAccountVersion: formData.get("expectedAccountVersion"),
      expectedProfileVersion: formData.get("expectedProfileVersion"),
      idempotencyKey: rawIdempotencyKey,
    });

    if (!command.success) {
      return {
        message:
          "Este formulário está desatualizado. Recarregue a página antes de reenviar.",
        status: "error",
        values: { role: parsed.data.role },
      };
    }

    try {
      const correctionService =
        await createServerCorrectedProfileResubmissionService();
      const correctionResult = await correctionService.resubmit({
        command: command.data,
        profile: parsed.data,
        requestId: crypto.randomUUID(),
      });

      if (correctionResult.kind === "conflict") {
        return {
          message:
            "Seu cadastro foi atualizado em outra aba. Recarregue a página e revise os dados antes de reenviar.",
          status: "error",
          values: { role: parsed.data.role },
        };
      }
    } catch {
      return {
        message:
          "Não foi possível reenviar as correções. Revise os dados ou tente novamente.",
        status: "error",
        values: { role: parsed.data.role },
      };
    }

    redirect("/app/status/analysis");
  }

  const service = await createServerOnboardingRegistrationService();
  let result: Awaited<ReturnType<typeof service.submitGoogleProfile>>;

  try {
    result = await service.submitGoogleProfile({
      email: user.email,
      identityId: user.id,
      profile: parsed.data,
    });
  } catch {
    return {
      message:
        "Não foi possível enviar o perfil para análise. Tente novamente.",
      status: "error",
      values: { role: parsed.data.role },
    };
  }

  redirect(result.destination);
}

export async function resendPreparedRegistrationConfirmationAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = formData.get("role");
  const normalizedRole =
    role === "COMPANY" || role === "INFLUENCER" ? role : undefined;

  if (!email) {
    return {
      message: "Informe um e-mail válido.",
      status: "error",
    };
  }

  const environment = getPublicEnv();
  const callbackUrl = new URL(
    "/auth/callback",
    environment.NEXT_PUBLIC_APP_URL,
  );
  callbackUrl.searchParams.set(
    "next",
    role === "COMPANY" ? "/onboarding/company" : "/onboarding/influencer",
  );
  const authClient = await createServerSupabaseClient();
  const { error } = await authClient.auth.resend({
    email,
    options: { emailRedirectTo: callbackUrl.toString() },
    type: "signup",
  });

  if (error) {
    const isRateLimited =
      error.status === 429 ||
      error.code === "email_rate_limit_exceeded" ||
      error.code === "over_email_send_rate_limit";

    return {
      message: isRateLimited
        ? "Aguarde alguns segundos antes de reenviar a confirmação."
        : "Não foi possível reenviar a confirmação agora. Tente novamente em instantes.",
      status: "error",
      values: { email, role: normalizedRole },
    };
  }

  return {
    message:
      "Se a confirmação ainda estiver pendente, enviaremos uma nova mensagem.",
    status: "success",
    values: { email, role: normalizedRole },
  };
}
