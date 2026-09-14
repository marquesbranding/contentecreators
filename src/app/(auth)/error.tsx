"use client";

import { ResultScreen } from "@/shared/components/result-screen";

export default function AuthError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ResultScreen
      description="Não foi possível carregar esta página agora. Tente novamente."
      primaryAction={{ label: "Tentar novamente", onClick: unstable_retry }}
      title="Algo deu errado"
      tone="error"
    />
  );
}
