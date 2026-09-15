"use server";
import { redirect } from "next/navigation";
import { loadRegistrationAccount } from "@/features/identity/server";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";
import { toUserFacingError } from "@/shared/lib/errors/user-facing-error";
import { parseRegistrationAccount } from "../../schemas/registration-account-schema";
import type { RegistrationStepState } from "../../types/registration-step.types";
import { saveRegistrationAccount } from "../repositories/registration-account.repository";

export async function saveRegistrationAccountAction(
  _state: RegistrationStepState,
  data: FormData,
): Promise<RegistrationStepState> {
  const { user, requiresPassword } = await loadRegistrationAccount();
  const parsed = parseRegistrationAccount(
    Object.fromEntries(data),
    requiresPassword,
  );
  if (!parsed.success)
    return {
      status: "error",
      message: "Revise os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  let role: "COMPANY" | "INFLUENCER";
  try {
    if (
      requiresPassword &&
      "password" in parsed.data &&
      typeof parsed.data.password === "string"
    ) {
      const client = await createServerSupabaseClient();
      const { error } = await client.auth.updateUser({
        password: parsed.data.password,
        data: { registration_password_pending: false },
      });
      if (error) throw error;
    }
    role = await saveRegistrationAccount(user.id, parsed.data);
  } catch (error) {
    const mapped = toUserFacingError(error, {
      operation: "sign_up",
      requestId: crypto.randomUUID(),
    });
    return {
      status: "error",
      message: mapped.message,
      fieldErrors: mapped.fieldErrors,
    };
  }
  redirect(
    role === "COMPANY" ? "/onboarding/company" : "/onboarding/influencer",
  );
}
