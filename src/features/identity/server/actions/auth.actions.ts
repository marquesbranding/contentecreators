"use server";

import "server-only";

import { redirect } from "next/navigation";
import type { ZodError } from "zod";

import { operationalLogger } from "@/shared/server/observability/operational-logger";

import { parseRegistrationIntent } from "../../domain/registration-intent";
import {
  forgotPasswordSchema,
  loginSchema,
  resendConfirmationSchema,
  resetPasswordSchema,
  signUpSchema,
} from "../../schemas/auth-form-schemas";
import type { AuthActionState, AuthFieldName } from "../../types/auth.types";
import { createServerBackofficeAuthService } from "../services/server-backoffice-auth.service";
import { createServerBannedAccountDefenseService } from "../services/server-banned-account-defense.service";
import { createServerIdentityAuthService } from "../services/server-identity-auth.service";

function formValue(formData: FormData, key: string) {
  return formData.get(key);
}

function validationFailure(error: ZodError, email?: string): AuthActionState {
  const flattened = error.flatten().fieldErrors as Partial<
    Record<AuthFieldName, string[] | undefined>
  >;
  const fieldErrors: Partial<Record<AuthFieldName, string[]>> = {};

  for (const field of ["email", "password", "passwordConfirmation"] as const) {
    const messages = flattened[field];

    if (messages?.length) {
      fieldErrors[field] = messages;
    }
  }

  return {
    fieldErrors,
    message: "Revise os campos destacados.",
    status: "error",
    values: email ? { email } : undefined,
  };
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    nextPath: formValue(formData, "nextPath"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return validationFailure(
      parsed.error,
      String(formValue(formData, "email") ?? ""),
    );
  }

  const service = await createServerIdentityAuthService();
  const requestId = crypto.randomUUID();
  const result = await service.signIn(parsed.data);
  operationalLogger.info({
    event: "auth_result",
    operation: "application_password_sign_in",
    outcome: result.kind,
    requestId,
  });

  if (result.kind === "redirect") {
    const defense = await createServerBannedAccountDefenseService();
    const access = await defense.enforce(requestId, "NON_ADMIN");

    if (access.kind === "blocked") {
      operationalLogger.warn({
        accountStatus: "BANNED",
        event: "banned_identity_attempt",
        operation: "application_access",
        outcome: "blocked",
        requestId,
      });
      redirect(access.destination);
    }

    redirect(result.destination);
  }

  return {
    message: result.message,
    status: "error",
    values: { email: parsed.data.email },
  };
}

export async function signInBackofficeAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    nextPath: formValue(formData, "nextPath"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return validationFailure(
      parsed.error,
      String(formValue(formData, "email") ?? ""),
    );
  }

  const service = await createServerBackofficeAuthService();
  const requestId = crypto.randomUUID();
  const result = await service.signIn(parsed.data, requestId);
  operationalLogger.info({
    event: "auth_result",
    operation: "backoffice_password_sign_in",
    outcome: result.kind,
    requestId,
  });

  if (result.kind === "redirect") {
    redirect(result.destination);
  }

  return {
    message: result.message,
    status: "error",
    values: { email: parsed.data.email },
  };
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    email: formValue(formData, "email"),
    intent: formValue(formData, "intent"),
    password: formValue(formData, "password"),
    passwordConfirmation: formValue(formData, "passwordConfirmation"),
  });

  if (!parsed.success) {
    return validationFailure(
      parsed.error,
      String(formValue(formData, "email") ?? ""),
    );
  }

  const service = await createServerIdentityAuthService();
  const result = await service.signUp(parsed.data);

  if (result.kind === "redirect") {
    redirect(result.destination);
  }

  return {
    message: result.message,
    status:
      result.kind === "confirmation_required"
        ? "confirmation_required"
        : "error",
    values: { email: parsed.data.email },
  };
}

export async function startGoogleSignInAction(
  formData: FormData,
): Promise<void> {
  const service = await createServerIdentityAuthService();
  const intent = parseRegistrationIntent(formValue(formData, "intent"));
  const result = await service.beginGoogleSignIn(
    formValue(formData, "nextPath"),
    intent,
  );

  if (result.kind === "redirect") {
    redirect(result.url);
  }

  redirect("/login?error=provider");
}

export async function startBackofficeGoogleSignInAction(
  formData: FormData,
): Promise<void> {
  const service = await createServerBackofficeAuthService();
  const result = await service.beginGoogleSignIn(
    formValue(formData, "nextPath"),
  );

  if (result.kind === "redirect") {
    redirect(result.url);
  }

  redirect("/backoffice/login?error=provider");
}

export async function resendConfirmationAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resendConfirmationSchema.safeParse({
    email: formValue(formData, "email"),
    intent: formValue(formData, "intent"),
  });

  if (!parsed.success) {
    return validationFailure(
      parsed.error,
      String(formValue(formData, "email") ?? ""),
    );
  }

  const service = await createServerIdentityAuthService();
  const result = await service.resendConfirmation(
    parsed.data.email,
    parsed.data.intent,
  );

  return {
    message: result.message,
    status: "success",
    values: { email: parsed.data.email },
  };
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formValue(formData, "email"),
  });

  if (!parsed.success) {
    return validationFailure(
      parsed.error,
      String(formValue(formData, "email") ?? ""),
    );
  }

  const service = await createServerIdentityAuthService();
  const result = await service.requestPasswordRecovery(parsed.data.email);

  return {
    message: result.message,
    status: "success",
    values: { email: parsed.data.email },
  };
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formValue(formData, "password"),
    passwordConfirmation: formValue(formData, "passwordConfirmation"),
  });

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const service = await createServerIdentityAuthService();
  const result = await service.updatePassword(parsed.data);

  return {
    message: result.message,
    status: result.kind === "success" ? "success" : "error",
  };
}

export async function signOutAction(): Promise<void> {
  const service = await createServerIdentityAuthService();
  await service.signOut();
  redirect("/");
}
