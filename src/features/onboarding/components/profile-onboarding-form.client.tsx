"use client";

import { CircleAlert } from "lucide-react";
import { useActionState, useState } from "react";

import {
  ProfileHeaderMediaEditor,
  type MediaUploadActions,
} from "@/features/media";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";
import { creatorNicheOptions } from "@/shared/domain/profile-segments";
import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import type { ProfileHeaderPreviewBadge } from "@/shared/components/profile-header-preview";
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
import type {
  CompanyOnboardingDraftPayload,
  CreatorOnboardingDraftPayload,
} from "../schemas/onboarding-draft-schema";
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

export interface OnboardingMediaState {
  coverAssetId: string | null;
  primaryAssetId: string | null;
  profileExists: boolean;
}

type ProfileOnboardingFormProps = {
  action: OnboardingAction;
  correctionCommand?: CorrectedProfileResubmissionCommand;
  draftAction: OnboardingDraftAction;
  initialDraft: OnboardingDraftClientDto | null;
  initialMediaState: OnboardingMediaState;
  initialMediaUrls?: { cover?: string | null; primary?: string | null };
  initialValues?: OnboardingDraftPayload;
  mediaActions: MediaUploadActions;
  role: "INFLUENCER" | "COMPANY";
};

function initialsFromName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

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
  initialMediaState,
  initialMediaUrls,
  initialValues,
  mediaActions,
  role,
}: ProfileOnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialOnboardingActionState,
  );
  const {
    clearFieldError,
    clientFieldErrors,
    focusInvalidField,
    formRef,
    formValidationProps,
    getFieldErrors,
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
  const resolvedInitialValues =
    initialValues ??
    (initialDraft?.role === role ? initialDraft.payload : undefined);
  const knownCreatorType =
    role === "INFLUENCER"
      ? (resolvedInitialValues as CreatorOnboardingDraftPayload | undefined)
          ?.creatorType
      : undefined;
  const seedName =
    role === "COMPANY"
      ? ((resolvedInitialValues as CompanyOnboardingDraftPayload | undefined)
          ?.tradeName ?? "")
      : ((resolvedInitialValues as CreatorOnboardingDraftPayload | undefined)
          ?.legalName ?? "");
  const seedCity =
    (resolvedInitialValues as { city?: string } | undefined)?.city ?? "";
  const seedState =
    (resolvedInitialValues as { state?: string } | undefined)?.state ?? "";
  const seedSegment =
    role === "COMPANY"
      ? ((resolvedInitialValues as CompanyOnboardingDraftPayload | undefined)
          ?.segment ?? "")
      : "";
  const seedNicheSlugs =
    role === "INFLUENCER"
      ? ((resolvedInitialValues as CreatorOnboardingDraftPayload | undefined)
          ?.nicheSlugs ?? [])
      : [];
  const [preview, setPreview] = useState({
    creatorType: knownCreatorType,
    location:
      seedCity && seedState
        ? `${seedCity}, ${seedState.toUpperCase()}`
        : seedCity,
    name: seedName,
    nicheLabels: seedNicheSlugs
      .map(
        (slug) =>
          creatorNicheOptions.find(
            ([optionSlug]) => optionSlug === slug,
          )?.[1] ?? slug,
      )
      .slice(0, 3),
    segment: seedSegment,
  });

  function readPreviewFromForm() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const data = new FormData(form);
    const city = String(data.get("city") ?? "").trim();
    const stateAbbreviation = String(data.get("state") ?? "").trim();
    const nicheLabels = data
      .getAll("nicheSlugs")
      .map((value) => String(value))
      .map(
        (slug) =>
          creatorNicheOptions.find(
            ([optionSlug]) => optionSlug === slug,
          )?.[1] ?? slug,
      )
      .slice(0, 3);

    setPreview({
      creatorType:
        (data.get("creatorType") as "INFLUENCER" | "UGC" | null) ?? undefined,
      location:
        city && stateAbbreviation
          ? `${city}, ${stateAbbreviation.toUpperCase()}`
          : city,
      name: String(
        data.get(role === "COMPANY" ? "tradeName" : "legalName") ?? "",
      ),
      nicheLabels,
      segment: String(data.get("segment") ?? "").trim(),
    });
  }

  const badges: ProfileHeaderPreviewBadge[] =
    role === "COMPANY"
      ? [
          { label: accountTypeLabels.COMPANY, tone: "primary" },
          ...(preview.segment
            ? [{ label: preview.segment, tone: "neutral" as const }]
            : []),
        ]
      : [
          {
            label:
              preview.creatorType === "UGC"
                ? accountTypeLabels.UGC
                : accountTypeLabels.INFLUENCER,
            tone: "primary",
          },
          ...preview.nicheLabels.map((label) => ({
            label,
            tone: "neutral" as const,
          })),
        ];

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
          readPreviewFromForm();
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

        <ProfileHeaderMediaEditor
          activateOnUpload={initialMediaState.profileExists}
          actions={mediaActions}
          avatar={{
            assetIdFieldName:
              role === "COMPANY" ? "logoAssetId" : "avatarAssetId",
            currentAssetId: initialMediaState.primaryAssetId,
            initialUrl: initialMediaUrls?.primary ?? null,
            label: role === "COMPANY" ? "Logo da empresa" : "Foto de perfil",
            purpose: role === "COMPANY" ? "LOGO" : "AVATAR",
          }}
          badges={badges}
          cover={{
            assetIdFieldName: "coverAssetId",
            currentAssetId: initialMediaState.coverAssetId,
            initialUrl: initialMediaUrls?.cover ?? null,
            label: role === "COMPANY" ? "Capa da empresa" : "Imagem de capa",
            purpose: "COVER",
          }}
          displayName={
            preview.name ||
            (role === "COMPANY"
              ? "Nome fantasia da empresa"
              : "Seu nome completo")
          }
          helperText="Toque ou clique na capa e na foto de perfil para adicioná-las. As imagens ficam privadas até o envio do cadastro."
          initials={initialsFromName(preview.name)}
          location={preview.location}
        />

        <RequiredFieldsNotice />
        <FormErrorSummary
          errors={summaryErrors}
          onFieldSelect={focusInvalidField}
        />
        <ProfileFormFields
          creatorType={knownCreatorType}
          fieldErrors={state.fieldErrors}
          getFieldErrors={getFieldErrors}
          initialValues={resolvedInitialValues}
          onFieldChange={clearFieldError}
          role={role}
        />
        <ActionSubmitButton
          className="w-full"
          pending={pending}
          pendingLabel="Enviando para análise..."
          size="lg"
        >
          Enviar perfil para análise
        </ActionSubmitButton>
      </form>
      <OnboardingSubmitConfirmation
        onConfirm={submitConfirmation.confirmSubmission}
        onOpenChange={submitConfirmation.setOpen}
        open={submitConfirmation.open}
      />
    </>
  );
}
