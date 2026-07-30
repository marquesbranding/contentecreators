"use client";

import { CheckCircle2, CircleAlert, Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Spinner } from "@/shared/components/ui/spinner";
import { Textarea } from "@/shared/components/ui/textarea";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";
import { useUnsavedChangesGuard } from "@/shared/hooks/use-unsaved-changes-guard";

import type {
  CompanyProfileAction,
  CompanyProfileDto,
} from "../types/company-profile.types";
import { initialCompanyProfileActionState } from "../types/company-profile.types";
import { FormErrorSummary, mergeFieldErrors } from "./form-error-summary";
import { ProfileFormFields } from "./profile-form-fields.client";

export function CompanyProfileEditForm({
  action,
  backHref = "/app/catalog",
  backLabel = "Voltar ao catálogo",
  changeReason,
  expectedVersion,
  formLabel = "Editar perfil da empresa",
  mediaFields,
  onProfileVersionChange,
  profile,
  submitLabel = "Salvar alterações",
}: {
  action: CompanyProfileAction;
  backHref?: string;
  backLabel?: string;
  changeReason?: {
    description: string;
    label: string;
    placeholder: string;
  };
  expectedVersion: number;
  formLabel?: string;
  mediaFields?: React.ReactNode;
  onProfileVersionChange?: (version: number) => void;
  profile: CompanyProfileDto;
  submitLabel?: string;
}) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const actionWithClientSync = useCallback<CompanyProfileAction>(
    async (previousState, formData) => {
      const nextState = await action(previousState, formData);

      if (nextState.status === "success" && nextState.profileVersion) {
        setHasUnsavedChanges(false);
        onProfileVersionChange?.(nextState.profileVersion);
      }

      return nextState;
    },
    [action, onProfileVersionChange],
  );
  const [state, formAction, pending] = useActionState(
    actionWithClientSync,
    initialCompanyProfileActionState,
  );
  const formValidation = useRequiredFieldValidation();
  const summaryErrors = mergeFieldErrors(
    formValidation.clientFieldErrors,
    state.fieldErrors,
  );
  useUnsavedChangesGuard(hasUnsavedChanges && !pending);

  return (
    <form
      action={formAction}
      aria-label={formLabel}
      className="space-y-9"
      noValidate
      onBlur={formValidation.formValidationProps.onBlur}
      onInput={(event) => {
        setHasUnsavedChanges(true);
        formValidation.formValidationProps.onInput(event);
      }}
      onSubmit={formValidation.formValidationProps.onSubmit}
    >
      <input name="expectedVersion" type="hidden" value={expectedVersion} />
      {state.message ? (
        <Alert
          aria-live="polite"
          variant={state.status === "error" ? "destructive" : "default"}
        >
          {state.status === "success" ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <CircleAlert aria-hidden="true" />
          )}
          <AlertTitle>
            {state.status === "success"
              ? "Alterações publicadas"
              : "Não foi possível salvar"}
          </AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <RequiredFieldsNotice />
      <FormErrorSummary errors={summaryErrors} />
      <ProfileFormFields
        fieldErrors={state.fieldErrors}
        getFieldErrors={formValidation.getFieldErrors}
        initialValues={profile}
        onFieldChange={(fieldName) => {
          setHasUnsavedChanges(true);
          formValidation.clearFieldError(fieldName);
        }}
        role="COMPANY"
        showLegalConsents={false}
      />
      {changeReason ? (
        <Field
          data-invalid={Boolean(
            formValidation.getFieldErrors("reason", state.fieldErrors?.reason)
              ?.length,
          )}
        >
          <FieldLabel htmlFor="profile-change-reason" required>
            {changeReason.label}
          </FieldLabel>
          <Textarea
            aria-invalid={Boolean(
              formValidation.getFieldErrors("reason", state.fieldErrors?.reason)
                ?.length,
            )}
            id="profile-change-reason"
            maxLength={1000}
            minLength={10}
            name="reason"
            placeholder={changeReason.placeholder}
            required
            rows={4}
          />
          <FieldDescription>{changeReason.description}</FieldDescription>
          <FieldError
            errors={formValidation
              .getFieldErrors("reason", state.fieldErrors?.reason)
              ?.map((message) => ({ message }))}
          />
        </Field>
      ) : null}
      {mediaFields}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className={buttonVariants({ size: "lg", variant: "outline" })}
          href={backHref}
        >
          {backLabel}
        </Link>
        <Button disabled={pending} size="lg" type="submit">
          {pending ? (
            <Spinner aria-label="Salvando alterações" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
