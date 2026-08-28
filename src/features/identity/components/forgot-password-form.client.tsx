"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";

import type { AuthFormAction } from "../types/auth.types";
import { initialAuthActionState } from "../types/auth.types";
import { AuthFeedback } from "./auth-feedback";
import { AuthSubmitButton } from "./auth-submit-button";

export function ForgotPasswordForm({ action }: { action: AuthFormAction }) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAuthActionState,
  );
  const formValidation = useRequiredFieldValidation();
  const emailErrors = formValidation.getFieldErrors(
    "email",
    state.fieldErrors?.email,
  );
  const errorId = emailErrors?.length ? "recovery-email-error" : undefined;

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
          <Field data-invalid={Boolean(emailErrors?.length)}>
            <FieldLabel htmlFor="recovery-email" required>
              E-mail
            </FieldLabel>
            <Input
              aria-describedby={errorId}
              aria-invalid={Boolean(emailErrors?.length)}
              autoComplete="email"
              className="rounded-xl"
              id="recovery-email"
              inputMode="email"
              name="email"
              placeholder="voce@exemplo.com"
              required
              type="email"
            />
            <FieldError id={errorId}>
              {emailErrors?.map((message) => (
                <span className="block" key={message}>
                  {message}
                </span>
              ))}
            </FieldError>
          </Field>
          <AuthSubmitButton pending={pending} pendingLabel="Enviando...">
            Enviar instruções
          </AuthSubmitButton>
        </FieldGroup>
      </form>
      <Link
        className="text-brand-blue focus-visible:ring-ring/50 inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:outline-none"
        href="/login"
      >
        Voltar para o login
      </Link>
    </div>
  );
}
