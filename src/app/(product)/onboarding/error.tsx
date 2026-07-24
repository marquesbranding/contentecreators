"use client";

import { CircleAlert, RotateCcw } from "lucide-react";

import { OnboardingFormShell } from "@/features/onboarding";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";

export default function OnboardingError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <OnboardingFormShell
      currentStep={2}
      description="Seus dados continuam protegidos. Tente carregar o formulário novamente."
      progressLabel="Dados do perfil"
      title="Não foi possível abrir seu cadastro"
      totalSteps={2}
    >
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Falha temporária ao carregar</AlertTitle>
        <AlertDescription>
          Não conseguimos recuperar seu rascunho agora. Nenhum dado foi apagado.
        </AlertDescription>
      </Alert>
      <Button className="mt-6 w-full sm:w-auto" onClick={unstable_retry}>
        <RotateCcw aria-hidden="true" />
        Tentar novamente
      </Button>
    </OnboardingFormShell>
  );
}
