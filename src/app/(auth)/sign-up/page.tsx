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
      description={
        <>
          <p>
            Preencha suas informações para a criação de uma nova conta. Seu
            cadastro será enviado para análise e você será notificado(a)
            sobre o seu processo de aprovação no e-mail informado.
          </p>
          <p>
            Após aprovado seu perfil estará público nesta plataforma.
            Empresas poderão te encontrar e entrar em contato.
          </p>
          <p>
            O cadastro e toda interação dentro da plataforma é gratuito e se
            manterá assim durante a fase BETA. Qualquer alteração será
            notificada e só será aplicada após a sua aprovação.
          </p>
        </>
      }
      progressLabel="Conta e perfil"
      title="Crie sua conta e seu perfil"
      totalSteps={1}
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
