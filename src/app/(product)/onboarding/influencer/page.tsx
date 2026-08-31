import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createServerRoleSelectionService } from "@/features/identity/server";
import {
  activateProfileMediaAction,
  finalizeMediaUploadAction,
  getServerSignedMedia,
  loadCurrentInfluencerMediaFormState,
  prepareMediaUploadAction,
} from "@/features/media/server";
import {
  OnboardingFormShell,
  ProfileOnboardingForm,
} from "@/features/onboarding";
import {
  loadCurrentOnboardingDraft,
  loadCurrentPreparedInfluencerProfile,
  loadCurrentCorrectionContext,
  saveOnboardingDraftAction,
  submitGoogleProfileAction,
} from "@/features/onboarding/server";

export const metadata: Metadata = {
  title: "Cadastro de creator",
};

export default async function InfluencerOnboardingPage() {
  const service = await createServerRoleSelectionService();
  const decision = await service.getEntryDecision();

  if (decision.kind === "ready") {
    redirect("/onboarding/role");
  }
  const correctionRequested =
    decision.destination === "/onboarding/influencer?corrections=requested";
  if (
    decision.destination !== "/onboarding/influencer" &&
    !correctionRequested
  ) {
    redirect(decision.destination);
  }
  const [initialDraft, mediaFormState, preparedProfile] = await Promise.all([
    loadCurrentOnboardingDraft(),
    loadCurrentInfluencerMediaFormState(),
    loadCurrentPreparedInfluencerProfile(),
  ]);
  const correctionContext = correctionRequested
    ? await loadCurrentCorrectionContext()
    : undefined;

  if (correctionRequested && !correctionContext) {
    redirect("/app");
  }

  const [avatarMedia, coverMedia] = await Promise.all([
    mediaFormState.avatarAssetId
      ? getServerSignedMedia(mediaFormState.avatarAssetId)
      : null,
    mediaFormState.coverAssetId
      ? getServerSignedMedia(mediaFormState.coverAssetId)
      : null,
  ]);

  return (
    <OnboardingFormShell
      currentStep={2}
      description="Complete seu perfil de creator. Ao enviar, o cadastro ficará aguardando a revisão da nossa equipe."
      correctionReason={correctionContext?.reason}
      correctionRequested={correctionRequested}
      progressLabel="Dados do perfil"
      title="Conte sobre o seu trabalho"
      totalSteps={2}
    >
      <ProfileOnboardingForm
        action={submitGoogleProfileAction}
        correctionCommand={correctionContext?.command}
        draftAction={saveOnboardingDraftAction}
        initialDraft={initialDraft}
        initialValues={
          correctionContext?.initialValues ??
          (initialDraft?.role === "INFLUENCER"
            ? undefined
            : (preparedProfile ?? undefined))
        }
        initialMediaState={{
          coverAssetId: mediaFormState.coverAssetId,
          primaryAssetId: mediaFormState.avatarAssetId,
          profileExists: mediaFormState.profileExists,
        }}
        initialMediaUrls={{
          cover: coverMedia?.url ?? null,
          primary: avatarMedia?.url ?? null,
        }}
        mediaActions={{
          activate: activateProfileMediaAction,
          finalize: finalizeMediaUploadAction,
          prepare: prepareMediaUploadAction,
        }}
        role="INFLUENCER"
      />
    </OnboardingFormShell>
  );
}
