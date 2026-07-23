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
      description="Crie seu acesso e envie todos os dados do perfil em um único cadastro. Depois da confirmação do e-mail, nossa equipe inicia a análise."
      title="Crie sua conta e seu perfil"
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
