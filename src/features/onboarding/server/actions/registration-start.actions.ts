"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  consumeRegistrationLimit,
  ensureCurrentOnboardingAccount,
  sendRegistrationCode,
  createServerBannedAccountDefenseService,
} from "@/features/identity/server";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";
import { toUserFacingError } from "@/shared/lib/errors/user-facing-error";
import type { RegistrationStepState } from "../../types/registration-step.types";
import { createServerRegistrationStartService } from "../services/server-registration-start.service";
import { shouldUseSecureCookies } from "@/shared/server/security/secure-cookies";

function failure(error: unknown): RegistrationStepState {
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

export async function checkRegistrationStartEmailAction(
  email: string,
): Promise<RegistrationStepState> {
  try {
    const result = await createServerRegistrationStartService(true).start(
      email,
      true,
    );
    if (result.status === "account_exists")
      (await cookies()).set("cc_login_email", result.email, {
        httpOnly: true,
        sameSite: "lax",
        secure: shouldUseSecureCookies(),
        path: "/",
        maxAge: 1800,
      });
    return result;
  } catch (error) {
    return failure(error);
  }
}

export async function startEmailRegistrationAction(
  _state: RegistrationStepState,
  data: FormData,
): Promise<RegistrationStepState> {
  let result: RegistrationStepState;
  try {
    result = await createServerRegistrationStartService().start(
      data.get("email"),
    );
    const store = await cookies();
    const options = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: shouldUseSecureCookies(),
      path: "/",
      maxAge: 1800,
    };
    if (result.status === "account_exists" && result.email)
      store.set("cc_login_email", result.email, options);
    const intent = data.get("intent");
    if (
      typeof intent === "string" &&
      ["INFLUENCER", "UGC", "COMPANY"].includes(intent)
    )
      store.set("cc_signup_intent", intent, options);
  } catch (error) {
    return failure(error);
  }
  if (result.status === "success") redirect("/sign-up/verify");
  return result;
}

export async function verifyRegistrationCodeAction(
  _state: RegistrationStepState,
  data: FormData,
): Promise<RegistrationStepState> {
  const store = await cookies();
  const email = store.get("cc_signup_email")?.value;
  const token = z
    .string()
    .regex(/^\d{6}$/)
    .safeParse(data.get("code"));
  if (!email)
    return {
      status: "error",
      message: "Seu acesso expirou. Volte e informe seu e-mail novamente.",
    };
  if (!token.success)
    return {
      status: "error",
      message: "Informe o código de 6 dígitos.",
      fieldErrors: { code: ["Informe o código de 6 dígitos."] },
    };
  try {
    if (!(await consumeRegistrationLimit(email, "registrationCodeVerify")))
      return {
        status: "error",
        message: "Muitas tentativas. Aguarde antes de tentar novamente.",
      };
    const client = await createServerSupabaseClient();
    const { error } = await client.auth.verifyOtp({
      email,
      token: token.data,
      type: "email",
    });
    if (error)
      return {
        status: "error",
        message:
          "Código inválido ou expirado. Confira o e-mail ou solicite outro código.",
      };
    const access = await (
      await createServerBannedAccountDefenseService()
    ).enforce(crypto.randomUUID(), "NON_ADMIN");
    if (access.kind === "blocked")
      return {
        status: "error",
        message: "Não foi possível continuar. Fale com o suporte.",
      };
    await ensureCurrentOnboardingAccount();
    store.delete("cc_signup_email");
  } catch (error) {
    return failure(error);
  }
  redirect("/onboarding/account");
}

export async function resendRegistrationCodeAction(): Promise<RegistrationStepState> {
  const email = (await cookies()).get("cc_signup_email")?.value;
  if (!email)
    return {
      status: "error",
      message: "Volte e informe seu e-mail novamente.",
    };
  try {
    if (!(await consumeRegistrationLimit(email, "registrationCodeResend")))
      return {
        status: "error",
        message: "Aguarde antes de reenviar o código.",
      };
    await sendRegistrationCode(email, false);
    return {
      status: "success",
      message: "Enviamos um novo código. Confira seu e-mail.",
    };
  } catch (error) {
    return failure(error);
  }
}
