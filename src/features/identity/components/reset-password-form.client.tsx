"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FieldGroup, RequiredFieldsNotice } from "@/shared/components/ui/field";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";

import type { AuthFormAction } from "../types/auth.types";
import { initialAuthActionState } from "../types/auth.types";
import { AuthFeedback } from "./auth-feedback";
import { AuthSubmitButton } from "./auth-submit-button";
import { PasswordField } from "./password-field.client";

export function ResetPasswordForm({ action }: { action: AuthFormAction }) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAuthActionState,
  );
  const formValidation = useRequiredFieldValidation();
  const passwordErrors = formValidation.getFieldErrors(
    "password",
    state.fieldErrors?.password,
  );
  const passwordConfirmationErrors = formValidation.getFieldErrors(
    "passwordConfirmation",
    state.fieldErrors?.passwordConfirmation,
  );

  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <AuthFeedback state={state} />
        <Link
          className="text-brand-blue focus-visible:ring-ring/50 inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:outline-none"
          href="/login"
        >
          Entrar com a nova senha
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AuthFeedback state={state} />
      <form
        action={formAction}
        noValidate
        {...formValidation.formValidationProps}
      >
        <FieldGroup>
          <RequiredFieldsNotice />
          <PasswordField
            autoComplete="new-password"
            description="Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e um número."
            error={passwordErrors}
            id="reset-password"
            label="Nova senha"
            name="password"
          />
          <PasswordField
            autoComplete="new-password"
            error={passwordConfirmationErrors}
            id="reset-password-confirmation"
            label="Confirmar nova senha"
            matchFieldName="password"
            matchMessage="As senhas não coincidem."
            name="passwordConfirmation"
          />
          <AuthSubmitButton pending={pending} pendingLabel="Atualizando...">
            Atualizar senha
          </AuthSubmitButton>
        </FieldGroup>
      </form>
      <Link
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:outline-none"
        href="/forgot-password"
      >
        Solicitar um novo link
      </Link>
    </div>
  );
}
