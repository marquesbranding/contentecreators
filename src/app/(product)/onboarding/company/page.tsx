import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createServerRoleSelectionService } from "@/features/identity/server";
import {
  activateProfileMediaAction,
  finalizeMediaUploadAction,
  getServerSignedMedia,
  loadCurrentCompanyMediaFormState,
  prepareMediaUploadAction,
} from "@/features/media/server";
import {
  OnboardingFormShell,
  ProfileOnboardingForm,
} from "@/features/onboarding";
import {
  loadCurrentOnboardingDraft,
  loadCurrentPreparedCompanyProfile,
  loadCurrentCorrectionContext,
  saveOnboardingDraftAction,
  submitGoogleProfileAction,
} from "@/features/onboarding/server";

export const metadata: Metadata = {
  title: "Cadastro de empresa",
};

export default async function CompanyOnboardingPage() {
  const service = await createServerRoleSelectionService();
  const decision = await service.getEntryDecision();

  if (decision.kind === "ready") {
    redirect("/onboarding/role");
  }
  const correctionRequested =
    decision.destination === "/onboarding/company?corrections=requested";
  if (decision.destination !== "/onboarding/company" && !correctionRequested) {
    redirect(decision.destination);
  }
  const [initialDraft, mediaFormState, preparedProfile] = await Promise.all([
    loadCurrentOnboardingDraft(),
    loadCurrentCompanyMediaFormState(),
    loadCurrentPreparedCompanyProfile(),
  ]);
  const correctionContext = correctionRequested
    ? await loadCurrentCorrectionContext()
    : undefined;

  if (correctionRequested && !correctionContext) {
    redirect("/app");
  }

  const [logoMedia, coverMedia] = await Promise.all([
    mediaFormState.logoAssetId
      ? getServerSignedMedia(mediaFormState.logoAssetId)
      : null,
    mediaFormState.coverAssetId
      ? getServerSignedMedia(mediaFormState.coverAssetId)
      : null,
  ]);

  return (
    <OnboardingFormShell
      currentStep={2}
      description="Complete os dados da empresa. Ao enviar, o cadastro ficará aguardando a revisão da nossa equipe."
      correctionReason={correctionContext?.reason}
      correctionRequested={correctionRequested}
      progressLabel="Dados da empresa"
      title="Conte sobre a sua empresa"
      totalSteps={2}
    >
      <ProfileOnboardingForm
        action={submitGoogleProfileAction}
        correctionCommand={correctionContext?.command}
        draftAction={saveOnboardingDraftAction}
        initialDraft={initialDraft}
        initialValues={
          correctionContext?.initialValues ??
          (initialDraft?.role === "COMPANY"
            ? undefined
            : (preparedProfile ?? undefined))
        }
        initialMediaState={{
          coverAssetId: mediaFormState.coverAssetId,
          primaryAssetId: mediaFormState.logoAssetId,
          profileExists: mediaFormState.profileExists,
        }}
        initialMediaUrls={{
          cover: coverMedia?.url ?? null,
          primary: logoMedia?.url ?? null,
        }}
        mediaActions={{
          activate: activateProfileMediaAction,
          finalize: finalizeMediaUploadAction,
          prepare: prepareMediaUploadAction,
        }}
        role="COMPANY"
      />
    </OnboardingFormShell>
  );
}
