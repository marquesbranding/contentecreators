import { OnboardingFormShell } from "@/features/onboarding";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <OnboardingFormShell
      currentStep={2}
      description="Estamos recuperando com segurança o progresso do seu cadastro."
      progressLabel="Carregando seus dados"
      title="Preparando seu formulário"
      totalSteps={2}
    >
      <div
        aria-busy="true"
        aria-label="Carregando formulário de cadastro"
        className="space-y-8"
        role="status"
      >
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-36 w-full" />
        <span className="sr-only">Carregando seu cadastro...</span>
      </div>
    </OnboardingFormShell>
  );
}
