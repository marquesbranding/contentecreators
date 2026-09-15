"use client";
import { useActionFeedback } from "@/shared/hooks/use-action-feedback";
import { Building2 } from "lucide-react";
import { useActionState, useState } from "react";
import { PasswordField } from "@/features/identity/client";
import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";
import { dispatchFormActionPreservingValues } from "@/shared/lib/forms/dispatch-form-action-preserving-values";
import { creatorTypeOptions } from "../domain/creator-type-options";
import { parseRegistrationAccount } from "../schemas/registration-account-schema";
import type { RegistrationStepAction } from "../types/registration-step.types";
import { DescriptiveRadioCardGroup } from "./descriptive-radio-card-group.client";

const options = [
  ...creatorTypeOptions,
  {
    value: "COMPANY" as const,
    label: "Sou empresa",
    icon: Building2,
    description:
      "Quero encontrar creators para divulgar minha marca, produtos ou serviços.",
  },
];

export function RegistrationAccountStep({
  action,
  email,
  fullName,
  requiresPassword,
  intent,
  mediaSection,
}: {
  action: RegistrationStepAction;
  email: string;
  fullName: string;
  requiresPassword: boolean;
  intent?: "INFLUENCER" | "UGC" | "COMPANY";
  mediaSection?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });
  const { errorAlertRef } = useActionFeedback(state, {
    title: "Cadastro atualizado",
  });
  const [accountType, setAccountType] = useState<
    "INFLUENCER" | "UGC" | "COMPANY" | null
  >(intent ?? null);
  const [valid, setValid] = useState(false);
  const { formRef, formValidationProps, getFieldErrors } =
    useRequiredFieldValidation();
  return (
    <form
      className="space-y-6"
      action={formAction}
      ref={formRef}
      noValidate
      onBlur={formValidationProps.onBlur}
      onInput={(event) => {
        formValidationProps.onInput(event);
        setValid(
          parseRegistrationAccount(
            {
              ...Object.fromEntries(new FormData(event.currentTarget)),
              accountType,
            },
            requiresPassword,
          ).success,
        );
      }}
      onSubmit={(event) => {
        formValidationProps.onSubmit(event);
        dispatchFormActionPreservingValues(event, formAction);
      }}
    >
      <RequiredFieldsNotice />
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
      <Field>
        <FieldLabel htmlFor="account-email">E-mail</FieldLabel>
        <Input id="account-email" value={email} disabled />
        <FieldDescription>Não pode ser alterado.</FieldDescription>
      </Field>
      {mediaSection}
      <Field>
        <FieldLabel htmlFor="fullName" required>
          Nome completo
        </FieldLabel>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          autoComplete="name"
          minLength={3}
          maxLength={160}
          required
          aria-invalid={Boolean(
            getFieldErrors("fullName", state.fieldErrors?.fullName)?.length,
          )}
        />
        <FieldDescription>
          Mínimo de 3 caracteres. Para empresas, informe o nome do responsável.
        </FieldDescription>
        <FieldError>
          {getFieldErrors("fullName", state.fieldErrors?.fullName)?.[0]}
        </FieldError>
      </Field>
      <Field>
        <FieldLabel id="account-type-label" required>
          Tipo de cadastro
        </FieldLabel>
        <DescriptiveRadioCardGroup
          ariaLabelledBy="account-type-label"
          idPrefix="account-type"
          name="accountType"
          options={options}
          value={accountType}
          errors={state.fieldErrors?.accountType}
          onValueChange={(value) => {
            setAccountType(value);
            if (formRef.current)
              setValid(
                parseRegistrationAccount(
                  {
                    ...Object.fromEntries(new FormData(formRef.current)),
                    accountType: value,
                  },
                  requiresPassword,
                ).success,
              );
          }}
        />
      </Field>
      {requiresPassword ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <PasswordField
            id="account-password"
            name="password"
            label="Senha"
            autoComplete="new-password"
            description="Mínimo de 8 caracteres, com maiúscula, minúscula e número."
            error={getFieldErrors("password", state.fieldErrors?.password)}
          />
          <PasswordField
            id="account-password-confirmation"
            name="passwordConfirmation"
            label="Confirmar senha"
            autoComplete="new-password"
            matchFieldName="password"
            error={getFieldErrors(
              "passwordConfirmation",
              state.fieldErrors?.passwordConfirmation,
            )}
          />
        </div>
      ) : null}
      <Field>
        <FieldLabel htmlFor="account-whatsapp" required>
          WhatsApp com DDD
        </FieldLabel>
        <Input
          id="account-whatsapp"
          name="whatsapp"
          type="tel"
          autoComplete="tel-national"
          required
          maxLength={20}
          aria-invalid={Boolean(
            getFieldErrors("whatsapp", state.fieldErrors?.whatsapp)?.length,
          )}
        />
        <FieldError>
          {getFieldErrors("whatsapp", state.fieldErrors?.whatsapp)?.[0]}
        </FieldError>
      </Field>
      <ActionSubmitButton
        className="w-full"
        disabled={!valid}
        pending={pending}
        pendingLabel="Salvando conta..."
      >
        Continuar para o perfil
      </ActionSubmitButton>
    </form>
  );
}
