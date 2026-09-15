"use server";

import "server-only";

import { redirect } from "next/navigation";

import { getPublicEnv } from "@/shared/lib/env/public-env";
import { toUserFacingError } from "@/shared/lib/errors/user-facing-error";
import { logUserFacingError } from "@/shared/server/errors/log-user-facing-error";
import { operationalLogger } from "@/shared/server/observability/operational-logger";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import { readAdditionalCompanyLocations } from "../../domain/company-location-form-data";
import { readSocialChannels } from "../../domain/social-channels-form-data";
import { correctedProfileResubmissionCommandSchema } from "../../schemas/corrected-profile-resubmission-schema";
import { googleProfileSchema } from "../../schemas/onboarding-form-schema";
import type { OnboardingActionState } from "../../types/onboarding-action.types";
import { createServerCorrectedProfileResubmissionService } from "../services/server-corrected-profile-resubmission.service";
import { createServerOnboardingRegistrationService } from "../services/server-onboarding-registration.service";
import { isUniqueViolation } from "../services/unique-violation";

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
    isCdlMember: formData.get("isCdlMember"),
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

export async function submitOnboardingProfileAction(
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

    const resubmissionRequestId = crypto.randomUUID();

    try {
      const correctionService =
        await createServerCorrectedProfileResubmissionService();
      const correctionResult = await correctionService.resubmit({
        command: command.data,
        profile: parsed.data,
        requestId: resubmissionRequestId,
      });

      if (correctionResult.kind === "conflict") {
        return {
          message:
            "Seu cadastro foi atualizado em outra aba. Recarregue a página e revise os dados antes de reenviar.",
          status: "error",
          values: { role: parsed.data.role },
        };
      }
    } catch (error) {
      const context = {
        operation: "save_profile" as const,
        requestId: resubmissionRequestId,
        role: parsed.data.role,
      };
      const mapped = toUserFacingError(error, context);
      logUserFacingError(error, mapped, context);

      return {
        errorCode: mapped.code,
        fieldErrors: mapped.fieldErrors,
        message: mapped.message,
        requestId: resubmissionRequestId,
        retryable: mapped.retryable,
        status: "error",
        title: mapped.title,
        values: { role: parsed.data.role },
      };
    }

    redirect("/app/status/analysis");
  }

  const service = await createServerOnboardingRegistrationService();
  const requestId = crypto.randomUUID();
  let result: Awaited<ReturnType<typeof service.submitGoogleProfile>>;

  try {
    result = await service.submitGoogleProfile({
      email: user.email,
      identityId: user.id,
      profile: parsed.data,
    });
  } catch (error) {
    if (isUniqueViolation(error, "company_profiles_cnpj_uidx")) {
      return {
        fieldErrors: { cnpj: ["Este CNPJ já está cadastrado."] },
        message: "Revise os campos destacados para continuar.",
        status: "error",
        values: { role: parsed.data.role },
      };
    }

    operationalLogger.error({
      details: {
        errorMessage: error instanceof Error ? error.message : String(error),
        role: parsed.data.role,
      },
      event: "onboarding_submission_failure",
      operation: "submit_google_profile",
      outcome: "error",
      requestId,
    });

    const context = {
      operation: "sign_up" as const,
      requestId,
      role: parsed.data.role,
    };
    const mapped = toUserFacingError(error, context);

    return {
      errorCode: mapped.code,
      fieldErrors: mapped.fieldErrors,
      message: mapped.message,
      requestId,
      retryable: mapped.retryable,
      status: "error",
      title: mapped.title,
      values: { role: parsed.data.role },
    };
  }

  redirect(`${result.destination}?submitted=1`);
}

export const submitGoogleProfileAction = submitOnboardingProfileAction;

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
