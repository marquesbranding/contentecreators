import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createServerRoleSelectionService } from "@/features/identity/server";
import { CompanyMediaFields } from "@/features/media";
import {
  activateProfileMediaAction,
  finalizeMediaUploadAction,
  loadCurrentCompanyMediaFormState,
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
  const [initialDraft, initialMediaState] = await Promise.all([
    loadCurrentOnboardingDraft(),
    loadCurrentCompanyMediaFormState(),
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
      description="Complete os dados da empresa. Ao enviar, o cadastro ficará aguardando a revisão da nossa equipe."
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
        initialValues={correctionContext?.initialValues}
        mediaFields={
          <CompanyMediaFields
            actions={{
              activate: activateProfileMediaAction,
              finalize: finalizeMediaUploadAction,
              prepare: prepareMediaUploadAction,
            }}
            initialState={initialMediaState}
          />
        }
        role="COMPANY"
      />
    </OnboardingFormShell>
  );
}
