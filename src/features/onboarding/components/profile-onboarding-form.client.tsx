"use client";

import { CircleAlert } from "lucide-react";
import { useActionState } from "react";

import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { RequiredFieldsNotice } from "@/shared/components/ui/field";
import { useActionSuccessToast } from "@/shared/hooks/use-action-success-toast";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";
import { useSubmitConfirmation } from "@/shared/hooks/use-submit-confirmation";
import { useUnsavedChangesGuard } from "@/shared/hooks/use-unsaved-changes-guard";
import { dispatchFormActionPreservingValues } from "@/shared/lib/forms/dispatch-form-action-preserving-values";
import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

import { useOnboardingAutosave } from "../hooks/use-onboarding-autosave";
import type { CorrectedProfileResubmissionCommand } from "../schemas/corrected-profile-resubmission-schema";
import type { OnboardingAction } from "../types/onboarding-action.types";
import { initialOnboardingActionState } from "../types/onboarding-action.types";
import type {
  OnboardingDraftAction,
  OnboardingDraftClientDto,
  OnboardingDraftPayload,
} from "../types/onboarding-draft.types";
import { FormErrorSummary, mergeFieldErrors } from "./form-error-summary";
import { OnboardingAutosaveStatus } from "./onboarding-autosave-status";
import { OnboardingSubmitConfirmation } from "./onboarding-submit-confirmation";
import { ProfileFormFields } from "./profile-form-fields.client";

type ProfileOnboardingFormProps = {
  action: OnboardingAction;
  correctionCommand?: CorrectedProfileResubmissionCommand;
  draftAction: OnboardingDraftAction;
  initialDraft: OnboardingDraftClientDto | null;
  initialValues?: OnboardingDraftPayload;
  mediaFields?: React.ReactNode;
  role: "INFLUENCER" | "COMPANY";
};

export function ProfileOnboardingForm(props: ProfileOnboardingFormProps) {
  return (
    <BrowserQueryProvider>
      <ProfileOnboardingFormContent {...props} />
    </BrowserQueryProvider>
  );
}

function ProfileOnboardingFormContent({
  action,
  correctionCommand,
  draftAction,
  initialDraft,
  initialValues,
  mediaFields,
  role,
}: ProfileOnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
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
  const autosave = useOnboardingAutosave({
    action: draftAction,
    initialDraft,
    role,
  });
  useUnsavedChangesGuard(autosave.hasUnsavedChanges && !pending);
  const summaryErrors = mergeFieldErrors(clientFieldErrors, state.fieldErrors);
  useActionSuccessToast(state, {
    title: correctionCommand ? "Correções reenviadas" : "Perfil enviado",
  });

  return (
    <>
      <form
        action={formAction}
        className="space-y-9"
        noValidate
        onBlur={formValidationProps.onBlur}
        onInput={(event) => {
          formValidationProps.onInput(event);
          autosave.onFormInput(event);
        }}
        onSubmit={(event) => {
          submitConfirmation.handleSubmit(event, formValidationProps.onSubmit);
          dispatchFormActionPreservingValues(event, formAction);
        }}
        ref={formRef}
      >
        <input name="role" type="hidden" value={role} />
        {correctionCommand ? (
          <>
            <input
              name="expectedAccountVersion"
              type="hidden"
              value={correctionCommand.expectedAccountVersion}
            />
            <input
              name="expectedProfileVersion"
              type="hidden"
              value={correctionCommand.expectedProfileVersion}
            />
            <input
              name="resubmissionIdempotencyKey"
              type="hidden"
              value={correctionCommand.idempotencyKey}
            />
          </>
        ) : null}
        <OnboardingAutosaveStatus status={autosave.status} />
        {state.message ? (
          <Alert aria-live="polite" variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Não foi possível enviar</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        <RequiredFieldsNotice />
        <FormErrorSummary errors={summaryErrors} />
        <ProfileFormFields
          fieldErrors={state.fieldErrors}
          getFieldErrors={getFieldErrors}
          initialValues={
            initialValues ??
            (initialDraft?.role === role ? initialDraft.payload : undefined)
          }
          onFieldChange={clearFieldError}
          role={role}
        />
        {mediaFields}
        <ActionSubmitButton
          className="w-full"
          disabled={!isFormValid}
          pending={pending}
          pendingLabel="Enviando para análise..."
          size="lg"
        >
          Enviar perfil para análise
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
    </>
  );
}
