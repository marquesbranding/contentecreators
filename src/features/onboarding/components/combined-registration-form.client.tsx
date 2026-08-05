"use client";

import { Building2, CircleAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { GoogleAuthOption, PasswordField } from "@/features/identity/client";
import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { useActionSuccessToast } from "@/shared/hooks/use-action-success-toast";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";
import { useSubmitConfirmation } from "@/shared/hooks/use-submit-confirmation";
import { useUnsavedChangesGuard } from "@/shared/hooks/use-unsaved-changes-guard";
import { cn } from "@/shared/lib/cn";
import { dispatchFormActionPreservingValues } from "@/shared/lib/forms/dispatch-form-action-preserving-values";

import type { OnboardingAction } from "../types/onboarding-action.types";
import { initialOnboardingActionState } from "../types/onboarding-action.types";
import { FormErrorSummary, mergeFieldErrors } from "./form-error-summary";
import { OnboardingSubmitConfirmation } from "./onboarding-submit-confirmation";
import { ProfileFormFields } from "./profile-form-fields.client";

const roleOptions = [
  {
    description: "Quero cadastrar meu perfil, audiência e canais.",
    icon: UserRound,
    label: "Sou creator",
    value: "INFLUENCER",
  },
  {
    description: "Quero cadastrar minha empresa para encontrar creators.",
    icon: Building2,
    label: "Sou empresa",
    value: "COMPANY",
  },
] as const;

export function CombinedRegistrationForm({
  action,
  googleAction,
  initialRole,
  resendAction,
}: {
  action: OnboardingAction;
  googleAction: (formData: FormData) => Promise<void>;
  initialRole?: "INFLUENCER" | "COMPANY";
  resendAction: OnboardingAction;
}) {
  const [role, setRole] = useState<"INFLUENCER" | "COMPANY" | null>(
    initialRole ?? null,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [state, formAction, pending] = useActionState(
    action,
    initialOnboardingActionState,
  );
  const [resendState, resendFormAction, resendPending] = useActionState(
    resendAction,
    initialOnboardingActionState,
  );
  const {
    clearFieldError,
    clientFieldErrors,
    formRef,
    formValidationProps,
    getFieldErrors,
    isFormValid,
  } = useRequiredFieldValidation();
  const submitConfirmation = useSubmitConfirmation();
  useActionSuccessToast(state, {
    successStatuses: ["success", "confirmation_required"],
    title:
      state.status === "confirmation_required"
        ? "Cadastro salvo"
        : "Cadastro concluído",
  });
  useActionSuccessToast(resendState, {
    title: "Confirmação reenviada",
  });
  useUnsavedChangesGuard(
    hasUnsavedChanges && !pending && state.status !== "confirmation_required",
  );
  const summaryErrors = mergeFieldErrors(clientFieldErrors, state.fieldErrors);
  const roleErrors = getFieldErrors("role", state.fieldErrors?.role);
  const emailErrors = getFieldErrors("email", state.fieldErrors?.email);
  const passwordErrors = getFieldErrors(
    "password",
    state.fieldErrors?.password,
  );
  const passwordConfirmationErrors = getFieldErrors(
    "passwordConfirmation",
    state.fieldErrors?.passwordConfirmation,
  );
  const accountAlreadyExists = state.errorCode === "account_already_exists";

  if (state.status === "confirmation_required" && state.values?.email) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTitle>Confirme seu e-mail</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <p className="text-muted-foreground text-sm leading-6">
          Enviamos o link para{" "}
          <strong className="text-foreground">{state.values.email}</strong>.
          Depois da confirmação, seu cadastro será enviado para análise
          automaticamente.
        </p>
        <form action={resendFormAction} className="space-y-3">
          <input name="email" type="hidden" value={state.values.email} />
          <input
            name="role"
            type="hidden"
            value={state.values.role ?? "INFLUENCER"}
          />
          {resendState.message ? (
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {resendState.message}
            </p>
          ) : null}
          <ActionSubmitButton
            className="w-full"
            pending={resendPending}
            pendingLabel="Reenviando confirmação..."
            size="lg"
            variant="outline"
          >
            Reenviar confirmação
          </ActionSubmitButton>
        </form>
        <Link className={buttonVariants({ variant: "link" })} href="/login">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {state.message ? (
        <Alert aria-live="polite" variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>
            {accountAlreadyExists
              ? "Conta já cadastrada"
              : "Revise seu cadastro"}
          </AlertTitle>
          <AlertDescription>
            <span className="block">{state.message}</span>
            {accountAlreadyExists ? (
              <span className="mt-4 flex flex-wrap gap-2">
                <Link className={buttonVariants({ size: "sm" })} href="/login">
                  Entrar
                </Link>
                <Link
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href="/forgot-password"
                >
                  Recuperar senha
                </Link>
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        action={formAction}
        className="space-y-9"
        noValidate
        onBlur={formValidationProps.onBlur}
        onInput={(event) => {
          setHasUnsavedChanges(true);
          formValidationProps.onInput(event);
        }}
        onSubmit={(event) => {
          submitConfirmation.handleSubmit(event, formValidationProps.onSubmit);
          dispatchFormActionPreservingValues(event, formAction);
        }}
        ref={formRef}
      >
        <RequiredFieldsNotice />
        <FormErrorSummary errors={summaryErrors} />
        <FieldSet>
          <FieldLegend id="registration-role-label" required>
            Como você vai usar a plataforma?
          </FieldLegend>
          <FieldDescription>
            Essa escolha define os dados do cadastro e não poderá ser alterada
            por você depois do envio.
          </FieldDescription>
          <Field data-invalid={Boolean(roleErrors?.length)}>
            <RadioGroup
              aria-describedby={
                roleErrors?.length ? "registration-role-error" : undefined
              }
              aria-invalid={Boolean(roleErrors?.length)}
              aria-labelledby="registration-role-label"
              aria-required="true"
              className="grid gap-4 md:grid-cols-2"
              data-field-kind="radio-group"
              data-field-name="role"
              data-required-field="true"
              data-required-message="Escolha como você vai usar a plataforma."
              name="role"
              onValueChange={(value) => {
                if (value === "INFLUENCER" || value === "COMPANY") {
                  setRole(value);
                  clearFieldError("role");
                }
              }}
              value={role}
            >
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const selected = role === option.value;

                return (
                  <label
                    className={cn(
                      "focus-within:ring-ring/40 flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition-colors focus-within:ring-3",
                      selected
                        ? "border-brand-blue bg-brand-blue-soft"
                        : "border-border hover:border-brand-blue/40",
                    )}
                    htmlFor={`registration-${option.value.toLowerCase()}`}
                    key={option.value}
                    onClick={() => setRole(option.value)}
                  >
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl",
                        selected
                          ? "bg-brand-blue text-white"
                          : "bg-muted text-foreground",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong
                        className="block"
                        id={`registration-${option.value.toLowerCase()}-title`}
                      >
                        {option.label}
                      </strong>
                      <span
                        className="text-muted-foreground mt-1 block text-sm leading-5"
                        id={`registration-${option.value.toLowerCase()}-description`}
                      >
                        {option.description}
                      </span>
                    </span>
                    <RadioGroupItem
                      aria-describedby={`registration-${option.value.toLowerCase()}-description`}
                      aria-labelledby={`registration-${option.value.toLowerCase()}-title`}
                      id={`registration-${option.value.toLowerCase()}`}
                      value={option.value}
                    />
                  </label>
                );
              })}
            </RadioGroup>
            <FieldError id="registration-role-error">
              {roleErrors?.map((message) => (
                <span className="block" key={message}>
                  {message}
                </span>
              ))}
            </FieldError>
          </Field>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Dados de acesso</FieldLegend>
          <FieldDescription>
            Você usará este e-mail para entrar e acompanhar a análise.
          </FieldDescription>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field
              className="md:col-span-2"
              data-invalid={Boolean(emailErrors?.length)}
            >
              <FieldLabel htmlFor="registration-email" required>
                E-mail
              </FieldLabel>
              <Input
                aria-describedby={
                  emailErrors?.length ? "registration-email-error" : undefined
                }
                aria-invalid={Boolean(emailErrors?.length)}
                autoComplete="email"
                className="h-12 rounded-xl"
                id="registration-email"
                inputMode="email"
                maxLength={320}
                name="email"
                placeholder="voce@exemplo.com"
                required
                type="email"
              />
              <FieldError id="registration-email-error">
                {emailErrors?.map((message) => (
                  <span className="block" key={message}>
                    {message}
                  </span>
                ))}
              </FieldError>
            </Field>
            <PasswordField
              autoComplete="new-password"
              description="Use 8 caracteres, maiúscula, minúscula e número."
              error={passwordErrors}
              id="registration-password"
              label="Senha"
              name="password"
            />
            <PasswordField
              autoComplete="new-password"
              error={passwordConfirmationErrors}
              id="registration-password-confirmation"
              label="Confirmar senha"
              matchFieldName="password"
              matchMessage="As senhas precisam ser iguais."
              name="passwordConfirmation"
            />
          </FieldGroup>
        </FieldSet>

        {role ? (
          <ProfileFormFields
            fieldErrors={state.fieldErrors}
            getFieldErrors={getFieldErrors}
            key={role}
            onFieldChange={clearFieldError}
            role={role}
          />
        ) : (
          <Alert>
            <AlertTitle>Escolha seu tipo de cadastro</AlertTitle>
            <AlertDescription>
              Ao selecionar creator ou empresa, os campos específicos aparecem
              aqui.
            </AlertDescription>
          </Alert>
        )}

        <ActionSubmitButton
          className="w-full"
          disabled={!isFormValid}
          pending={pending}
          pendingLabel="Criando cadastro..."
          size="lg"
        >
          Criar conta e enviar perfil
        </ActionSubmitButton>
        {!isFormValid && !pending ? (
          <p
            aria-live="polite"
            className="text-muted-foreground text-center text-sm"
          >
            Preencha corretamente todos os campos obrigatórios para liberar o
            envio.
          </p>
        ) : null}
      </form>
      <OnboardingSubmitConfirmation
        onConfirm={submitConfirmation.confirmSubmission}
        onOpenChange={submitConfirmation.setOpen}
        open={submitConfirmation.open}
      />

      <GoogleAuthOption action={googleAction} />

      <p className="text-muted-foreground text-center text-sm">
        Já tem uma conta?{" "}
        <Link
          className="text-brand-blue font-semibold hover:underline"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
