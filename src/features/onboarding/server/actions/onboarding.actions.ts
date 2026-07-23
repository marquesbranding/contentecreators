"use server";

import "server-only";

import { redirect } from "next/navigation";

import { getPublicEnv } from "@/shared/lib/env/public-env";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import {
  emailRegistrationSchema,
  googleProfileSchema,
} from "../../schemas/onboarding-form-schema";
import type { OnboardingActionState } from "../../types/onboarding-action.types";
import { createServerOnboardingRegistrationService } from "../services/server-onboarding-registration.service";

function formPayload(formData: FormData) {
  return {
    bio: formData.get("bio"),
    city: formData.get("city"),
    cnpj: formData.get("cnpj"),
    complement: formData.get("complement"),
    creatorType: formData.get("creatorType"),
    description: formData.get("description"),
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    employeeRange: formData.get("employeeRange"),
    engagementRate: formData.get("engagementRate"),
    followers: formData.get("followers"),
    legalName: formData.get("legalName"),
    neighborhood: formData.get("neighborhood"),
    nicheSlugs: formData.getAll("nicheSlugs"),
    number: formData.get("number"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
    postalCode: formData.get("postalCode"),
    privacyAccepted: formData.get("privacyAccepted"),
    role: formData.get("role"),
    segment: formData.get("segment"),
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
  callbackUrl.searchParams.set("next", "/app/status/analysis");
  const authClient = await createServerSupabaseClient();
  await authClient.auth.resend({
    email,
    options: { emailRedirectTo: callbackUrl.toString() },
    type: "signup",
  });

  return {
    message:
      "Se a confirmação ainda estiver pendente, enviaremos uma nova mensagem.",
    status: "success",
    values: { email },
  };
}
