"use client";
import { useActionFeedback } from "@/shared/hooks/use-action-feedback";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { GoogleAuthOption } from "@/features/identity/client";
import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import { Input } from "@/shared/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/shared/components/ui/field";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";
import { dispatchFormActionPreservingValues } from "@/shared/lib/forms/dispatch-form-action-preserving-values";
import type {
  RegistrationStepAction,
  RegistrationStepState,
} from "../types/registration-step.types";
import { RegisteredEmailDialog } from "./registered-email-dialog";

export function RegistrationEmailStep({
  action,
  checkAction,
  googleAction,
  intent,
}: {
  action: RegistrationStepAction;
  checkAction: (email: string) => Promise<RegistrationStepState>;
  googleAction: (data: FormData) => Promise<void>;
  intent?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });
  const { errorAlertRef } = useActionFeedback(state, {
    title: "Cadastro atualizado",
  });
  const [email, setEmail] = useState("");
  const [checked, setChecked] = useState<RegistrationStepState>({
    status: "idle",
  });
  const [dismissedEmail, setDismissedEmail] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const { formRef, formValidationProps, getFieldErrors } =
    useRequiredFieldValidation();
  const existing =
    state.status === "account_exists" &&
    state.email === email.trim().toLowerCase()
      ? state
      : checked;
  const open =
    existing.status === "account_exists" &&
    existing.email === email.trim().toLowerCase() &&
    dismissedEmail !== existing.email;
  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="space-y-5"
        ref={formRef}
        noValidate
        onInput={formValidationProps.onInput}
        onBlur={formValidationProps.onBlur}
        onSubmit={(event) => {
          setDismissedEmail(null);
          formValidationProps.onSubmit(event);
          dispatchFormActionPreservingValues(event, formAction);
        }}
      >
        <input name="intent" type="hidden" value={intent ?? ""} />
        <Field>
          <FieldLabel htmlFor="registration-email" required>
            E-mail
          </FieldLabel>
          <Input
            autoComplete="email"
            id="registration-email"
            name="email"
            type="email"
            required
            value={email}
            ref={emailRef}
            aria-invalid={Boolean(getFieldErrors("email")?.length)}
            onChange={(event) => {
              setEmail(event.target.value);
              setDismissedEmail(null);
            }}
            onBlur={async () => {
              const result = await checkAction(email);
              setChecked(result);
            }}
          />
          <FieldError>{getFieldErrors("email")?.[0]}</FieldError>
        </Field>
        {state.message ? (
          <div
            ref={errorAlertRef}
            tabIndex={-1}
            role="alert"
            className="text-destructive text-sm"
          >
            {state.message}
          </div>
        ) : null}
        <ActionSubmitButton
          className="w-full"
          disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
          pending={pending}
          pendingLabel="Enviando código..."
        >
          Continuar
        </ActionSubmitButton>
      </form>
      <GoogleAuthOption action={googleAction}>
        <input name="intent" type="hidden" value={intent ?? ""} />
      </GoogleAuthOption>
      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{" "}
        <Link className="text-brand-blue font-semibold" href="/login">
          Entrar
        </Link>
      </p>
      <RegisteredEmailDialog
        email={existing.email ?? email}
        open={open}
        providers={existing.providers}
        googleAction={googleAction}
        onOpenChange={(next) => {
          if (!next) setDismissedEmail(existing.email ?? email);
        }}
        onUseAnotherEmail={() => {
          setDismissedEmail(existing.email ?? email);
          setChecked({ status: "idle" });
          emailRef.current?.focus();
        }}
      />
    </div>
  );
}
