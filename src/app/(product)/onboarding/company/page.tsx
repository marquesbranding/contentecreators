import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createServerRoleSelectionService } from "@/features/identity/server";
import {
  OnboardingFormShell,
  ProfileOnboardingForm,
} from "@/features/onboarding";
import { submitGoogleProfileAction } from "@/features/onboarding/server";

export const metadata: Metadata = {
  title: "Cadastro de empresa",
};

export default async function CompanyOnboardingPage() {
  const service = await createServerRoleSelectionService();
  const decision = await service.getEntryDecision();

  if (decision.kind === "ready") {
    redirect("/onboarding/role");
  }
  if (decision.destination !== "/onboarding/company") {
    redirect(decision.destination);
  }

  return (
    <OnboardingFormShell
      description="Complete os dados da empresa. Ao enviar, o cadastro ficará aguardando a revisão da nossa equipe."
      progress={75}
      title="Conte sobre a sua empresa"
    >
      <ProfileOnboardingForm
        action={submitGoogleProfileAction}
        role="COMPANY"
      />
    </OnboardingFormShell>
  );
}
