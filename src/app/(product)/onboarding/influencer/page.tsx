import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createServerRoleSelectionService } from "@/features/identity/server";
import { InfluencerMediaFields } from "@/features/media";
import {
  activateProfileMediaAction,
  finalizeMediaUploadAction,
  loadCurrentInfluencerMediaFormState,
  prepareMediaUploadAction,
} from "@/features/media/server";
import {
  OnboardingFormShell,
  ProfileOnboardingForm,
} from "@/features/onboarding";
import {
  loadCurrentOnboardingDraft,
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
  const [initialDraft, initialMediaState] = await Promise.all([
    loadCurrentOnboardingDraft(),
    loadCurrentInfluencerMediaFormState(),
  ]);
  const correctionContext = correctionRequested
    ? await loadCurrentCorrectionContext()
    : undefined;

  if (correctionRequested && !correctionContext) {
    redirect("/app");
  }

  return (
    <OnboardingFormShell
      currentStep={2}
      description="Complete seu perfil de creator. Ao enviar, o cadastro ficará aguardando a revisão da nossa equipe."
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
        initialValues={correctionContext?.initialValues}
        mediaFields={
          <InfluencerMediaFields
            actions={{
              activate: activateProfileMediaAction,
              finalize: finalizeMediaUploadAction,
              prepare: prepareMediaUploadAction,
            }}
            initialState={initialMediaState}
          />
        }
        role="INFLUENCER"
      />
    </OnboardingFormShell>
  );
}
