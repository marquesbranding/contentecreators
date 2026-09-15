import type { Metadata } from "next";
import { parseSignUpAccountIntent } from "@/features/identity";
import { startGoogleSignInAction } from "@/features/identity/server";
import {
  OnboardingFormShell,
  RegistrationEmailStep,
} from "@/features/onboarding";
import {
  startEmailRegistrationAction,
  checkRegistrationStartEmailAction,
} from "@/features/onboarding/server";
export const metadata: Metadata = { title: "Criar conta" };
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const intent = parseSignUpAccountIntent((await searchParams).intent);
  return (
    <OnboardingFormShell
      currentStep={1}
      totalSteps={6}
      progressLabel="E-mail"
      title="Crie sua conta"
      description="Comece pelo seu e-mail ou pela sua conta Google. Depois, complete seu perfil para análise. O cadastro é gratuito durante a fase BETA."
    >
      <RegistrationEmailStep
        action={startEmailRegistrationAction}
        checkAction={checkRegistrationStartEmailAction}
        googleAction={startGoogleSignInAction}
        intent={intent}
      />
    </OnboardingFormShell>
  );
}
