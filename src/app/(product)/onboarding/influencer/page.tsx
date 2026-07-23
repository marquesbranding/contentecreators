import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createServerRoleSelectionService } from "@/features/identity/server";
import {
  OnboardingFormShell,
  ProfileOnboardingForm,
} from "@/features/onboarding";
import { submitGoogleProfileAction } from "@/features/onboarding/server";

export const metadata: Metadata = {
  title: "Cadastro de creator",
};

export default async function InfluencerOnboardingPage() {
  const service = await createServerRoleSelectionService();
  const decision = await service.getEntryDecision();

  if (decision.kind === "ready") {
    redirect("/onboarding/role");
  }
  if (decision.destination !== "/onboarding/influencer") {
    redirect(decision.destination);
  }

  return (
    <OnboardingFormShell
      description="Complete seu perfil de creator. Ao enviar, o cadastro ficará aguardando a revisão da nossa equipe."
      progress={75}
      title="Conte sobre o seu trabalho"
    >
      <ProfileOnboardingForm
        action={submitGoogleProfileAction}
        role="INFLUENCER"
      />
    </OnboardingFormShell>
  );
}
