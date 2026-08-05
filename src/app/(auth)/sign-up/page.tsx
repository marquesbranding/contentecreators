import type { Metadata } from "next";

import { parseRegistrationIntent } from "@/features/identity";
import { startGoogleSignInAction } from "@/features/identity/server";
import {
  CombinedRegistrationForm,
  OnboardingFormShell,
} from "@/features/onboarding";
import {
  registerWithEmailAction,
  resendPreparedRegistrationConfirmationAction,
} from "@/features/onboarding/server";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta na Contente Creators.",
};

interface SignUpPageProps {
  searchParams: Promise<{
    intent?: string | string[];
  }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const parameters = await searchParams;
  const intentValue = Array.isArray(parameters.intent)
    ? parameters.intent[0]
    : parameters.intent;
  const intent = parseRegistrationIntent(intentValue);

  return (
    <OnboardingFormShell
      currentStep={1}
      description="Preencha seu acesso e os dados iniciais do perfil. Depois de confirmar o e-mail, você revisa tudo antes de enviar para análise."
      progressLabel="Conta e dados"
      title="Crie sua conta e seu perfil"
      totalSteps={2}
    >
      <CombinedRegistrationForm
        action={registerWithEmailAction}
        googleAction={startGoogleSignInAction}
        initialRole={intent}
        resendAction={resendPreparedRegistrationConfirmationAction}
      />
    </OnboardingFormShell>
  );
}
