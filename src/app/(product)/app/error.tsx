"use client";

import { ResultScreen } from "@/shared/components/result-screen";

export default function AppSectionError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ResultScreen
      description="Não foi possível carregar esta página agora. Tente novamente."
      primaryAction={{ label: "Tentar novamente", onClick: unstable_retry }}
      secondaryAction={{ href: "/app/catalog", label: "Ir para o catálogo" }}
      title="Algo deu errado"
      tone="error"
    />
  );
}
