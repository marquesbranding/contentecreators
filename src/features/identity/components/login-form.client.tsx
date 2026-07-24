"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";

import type { AuthFormAction, AuthRedirectAction } from "../types/auth.types";
import { initialAuthActionState } from "../types/auth.types";
import { AuthFeedback } from "./auth-feedback";
import { AuthSubmitButton } from "./auth-submit-button";
import { GoogleAuthButton } from "./google-auth-button";
import { PasswordField } from "./password-field.client";

interface LoginFormProps {
  googleAction: AuthRedirectAction;
  initialMessage?: string;
  initialNextPath: string;
  signInAction: AuthFormAction;
}

export function LoginForm({
  googleAction,
  initialMessage,
  initialNextPath,
  signInAction,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialMessage
      ? {
          message: initialMessage,
          status: "error" as const,
        }
      : initialAuthActionState,
  );
  const formValidation = useRequiredFieldValidation();
  const emailErrors = formValidation.getFieldErrors(
    "email",
    state.fieldErrors?.email,
  );
  const passwordErrors = formValidation.getFieldErrors(
    "password",
    state.fieldErrors?.password,
  );
  const emailErrorId = emailErrors?.length ? "login-email-error" : undefined;

  return (
    <div className="space-y-6">
      <AuthFeedback state={state} />

      <form
        action={formAction}
        noValidate
        {...formValidation.formValidationProps}
      >
        <input name="nextPath" type="hidden" value={initialNextPath} />
        <FieldGroup>
          <RequiredFieldsNotice />
          <Field data-invalid={Boolean(emailErrors?.length)}>
            <FieldLabel htmlFor="login-email" required>
              E-mail
            </FieldLabel>
            <Input
              aria-describedby={emailErrorId}
              aria-invalid={Boolean(emailErrors?.length)}
              autoComplete="email"
              className="h-12 rounded-xl"
              id="login-email"
              inputMode="email"
              name="email"
              placeholder="voce@exemplo.com"
              required
              type="email"
            />
            <FieldError id={emailErrorId}>
              {emailErrors?.map((message) => (
                <span className="block" key={message}>
                  {message}
                </span>
              ))}
            </FieldError>
          </Field>

          <div>
            <PasswordField
              autoComplete="current-password"
              error={passwordErrors}
              id="login-password"
              label="Senha"
              name="password"
            />
            <div className="mt-2 text-right">
              <Link
                className="text-brand-blue focus-visible:ring-ring/50 text-sm font-semibold underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:outline-none"
                href="/forgot-password"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <AuthSubmitButton pending={pending} pendingLabel="Entrando...">
            Entrar
          </AuthSubmitButton>
        </FieldGroup>
      </form>

      <FieldSeparator>ou</FieldSeparator>

      <form action={googleAction}>
        <input name="nextPath" type="hidden" value={initialNextPath} />
        <GoogleAuthButton />
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Ainda não tem uma conta?{" "}
        <Link
          className="text-brand-blue focus-visible:ring-ring/50 font-semibold underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:outline-none"
          href="/sign-up"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
