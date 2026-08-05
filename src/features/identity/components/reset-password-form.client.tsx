"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { ZodError } from "zod";

import { FieldGroup, RequiredFieldsNotice } from "@/shared/components/ui/field";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";
import { getBrowserSupabaseClient } from "@/shared/lib/supabase/browser-client";

import { resetPasswordSchema } from "../schemas/auth-form-schemas";
import type { AuthActionState, AuthFieldName } from "../types/auth.types";
import { initialAuthActionState } from "../types/auth.types";
import { AuthFeedback } from "./auth-feedback";
import { AuthSubmitButton } from "./auth-submit-button";
import { PasswordField } from "./password-field.client";

function formValue(formData: FormData, key: string) {
  return formData.get(key);
}

function validationFailure(error: ZodError): AuthActionState {
  const flattened = error.flatten().fieldErrors as Partial<
    Record<AuthFieldName, string[] | undefined>
  >;
  const fieldErrors: Partial<Record<AuthFieldName, string[]>> = {};

  for (const field of ["password", "passwordConfirmation"] as const) {
    const messages = flattened[field];

    if (messages?.length) {
      fieldErrors[field] = messages;
    }
  }

  return {
    fieldErrors,
    message: "Revise os campos destacados.",
    status: "error",
  };
}

export function ResetPasswordForm() {
  const [state, setState] = useState<AuthActionState>(initialAuthActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formValidation = useRequiredFieldValidation();
  const passwordErrors = formValidation.getFieldErrors(
    "password",
    state.fieldErrors?.password,
  );
  const passwordConfirmationErrors = formValidation.getFieldErrors(
    "passwordConfirmation",
    state.fieldErrors?.passwordConfirmation,
  );
  const { onSubmit: validateRequiredFields, ...formValidationProps } =
    formValidation.formValidationProps;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    validateRequiredFields(event);

    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      password: formValue(formData, "password"),
      passwordConfirmation: formValue(formData, "passwordConfirmation"),
    });

    if (!parsed.success) {
      setState(validationFailure(parsed.error));
      return;
    }

    const input = parsed.data;

    async function updatePassword() {
      setIsSubmitting(true);
      const client = getBrowserSupabaseClient();

      try {
        const { error } = await client.auth.updateUser({
          password: input.password,
        });

        if (error) {
          setState({
            message:
              "Não foi possível atualizar a senha. Solicite um novo link e tente novamente.",
            status: "error",
          });
          return;
        }

        await client.auth.signOut({ scope: "local" });
        setState({
          message:
            "Senha atualizada. Agora você já pode entrar com a nova senha.",
          status: "success",
        });
      } catch {
        setState({
          message:
            "Não foi possível atualizar a senha. Solicite um novo link e tente novamente.",
          status: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    }

    void updatePassword();
  }

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
      <form onSubmit={handleSubmit} noValidate {...formValidationProps}>
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
          <AuthSubmitButton
            pending={isSubmitting}
            pendingLabel="Atualizando..."
          >
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
