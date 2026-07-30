"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";

import type {
  AuthFormAction,
  AuthRedirectAction,
  RegistrationIntent,
} from "../types/auth.types";
import { initialAuthActionState } from "../types/auth.types";
import { AuthFeedback } from "./auth-feedback";
import { AuthSubmitButton } from "./auth-submit-button";
import { GoogleAuthOption } from "./google-auth-option.client";
import { PasswordField } from "./password-field.client";

interface SignUpFormProps {
  googleAction: AuthRedirectAction;
  initialIntent?: RegistrationIntent;
  resendAction?: AuthFormAction;
  signUpAction: AuthFormAction;
}

function ConfirmationResendForm({
  action,
  email,
  intent,
}: {
  action: AuthFormAction;
  email: string;
  intent?: RegistrationIntent;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input name="email" type="hidden" value={email} />
      <input name="intent" type="hidden" value={intent ?? ""} />
      <AuthFeedback state={state} />
      <AuthSubmitButton pending={pending} pendingLabel="Reenviando...">
        Reenviar confirmação
      </AuthSubmitButton>
    </form>
  );
}

export function SignUpForm({
  googleAction,
  initialIntent,
  resendAction,
  signUpAction,
}: SignUpFormProps) {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialAuthActionState,
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
  const passwordConfirmationErrors = formValidation.getFieldErrors(
    "passwordConfirmation",
    state.fieldErrors?.passwordConfirmation,
  );
  const emailErrorId = emailErrors?.length ? "signup-email-error" : undefined;

  if (state.status === "confirmation_required" && state.values?.email) {
    return (
      <div className="space-y-5">
        <AuthFeedback state={state} />
        <p className="text-muted-foreground text-sm leading-6">
          Abra a mensagem enviada para{" "}
          <strong className="text-foreground font-semibold">
            {state.values.email}
          </strong>
          . O link confirma sua identidade antes do preenchimento do perfil.
        </p>
        {resendAction ? (
          <ConfirmationResendForm
            action={resendAction}
            email={state.values.email}
            intent={initialIntent}
          />
        ) : null}
        <Link
          className="text-brand-blue focus-visible:ring-ring/50 inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:outline-none"
          href="/login"
        >
          Voltar para o login
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
        <input name="intent" type="hidden" value={initialIntent ?? ""} />
        <FieldGroup>
          <RequiredFieldsNotice />
          <Field data-invalid={Boolean(emailErrors?.length)}>
            <FieldLabel htmlFor="signup-email" required>
              E-mail
            </FieldLabel>
            <Input
              aria-describedby={emailErrorId}
              aria-invalid={Boolean(emailErrors?.length)}
              autoComplete="email"
              className="h-12 rounded-xl"
              id="signup-email"
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

          <PasswordField
            autoComplete="new-password"
            description="Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e um número."
            error={passwordErrors}
            id="signup-password"
            label="Senha"
            name="password"
          />

          <PasswordField
            autoComplete="new-password"
            error={passwordConfirmationErrors}
            id="signup-password-confirmation"
            label="Confirmar senha"
            matchFieldName="password"
            matchMessage="As senhas não coincidem."
            name="passwordConfirmation"
          />

          <FieldDescription>
            Ao continuar, você ainda escolherá e confirmará o tipo do seu perfil
            no primeiro acesso.
          </FieldDescription>

          <AuthSubmitButton pending={pending} pendingLabel="Criando conta...">
            Criar conta
          </AuthSubmitButton>
        </FieldGroup>
      </form>

      <GoogleAuthOption action={googleAction}>
        <input name="intent" type="hidden" value={initialIntent ?? ""} />
      </GoogleAuthOption>

      <p className="text-muted-foreground text-center text-sm">
        Já tem uma conta?{" "}
        <Link
          className="text-brand-blue focus-visible:ring-ring/50 font-semibold underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:outline-none"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
