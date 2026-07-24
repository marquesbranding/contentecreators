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
import { RequiredFieldsNotice } from "@/shared/components/ui/field";
import { Spinner } from "@/shared/components/ui/spinner";
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
  expectedVersion,
  mediaFields,
  onProfileVersionChange,
  profile,
}: {
  action: CompanyProfileAction;
  expectedVersion: number;
  mediaFields?: React.ReactNode;
  onProfileVersionChange?: (version: number) => void;
  profile: CompanyProfileDto;
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
      aria-label="Editar perfil da empresa"
      className="space-y-9"
      noValidate
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
      {mediaFields}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className={buttonVariants({ size: "lg", variant: "outline" })}
          href="/app/catalog"
        >
          Voltar ao catálogo
        </Link>
        <Button disabled={pending} size="lg" type="submit">
          {pending ? (
            <Spinner aria-label="Salvando alterações" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
