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
import { cn } from "@/shared/lib/cn";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";
import { useUnsavedChangesGuard } from "@/shared/hooks/use-unsaved-changes-guard";

import type {
  InfluencerProfileAction,
  InfluencerProfileDto,
} from "../types/influencer-profile.types";
import { initialInfluencerProfileActionState } from "../types/influencer-profile.types";
import { FormErrorSummary, mergeFieldErrors } from "./form-error-summary";
import { ProfileFormFields } from "./profile-form-fields.client";

export function InfluencerProfileEditForm({
  action,
  expectedVersion,
  mediaFields,
  onProfileVersionChange,
  profile,
}: {
  action: InfluencerProfileAction;
  expectedVersion: number;
  mediaFields?: React.ReactNode;
  onProfileVersionChange?: (version: number) => void;
  profile: InfluencerProfileDto;
}) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const actionWithClientSync = useCallback<InfluencerProfileAction>(
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
    initialInfluencerProfileActionState,
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
      aria-label="Editar perfil de creator"
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
        role="INFLUENCER"
        showLegalConsents={false}
      />
      {mediaFields}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
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
