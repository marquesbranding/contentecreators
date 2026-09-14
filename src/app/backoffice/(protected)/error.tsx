"use client";

import { useEffect } from "react";

import { ResultScreen } from "@/shared/components/result-screen";

export default function BackofficeError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ResultScreen
      description="Ocorreu uma falha inesperada. Tente carregar novamente. Se o problema continuar, informe o suporte."
      details={
        error.digest ? (
          <p className="text-muted-foreground text-center text-xs">
            Referência para o suporte:{" "}
            <code className="font-mono break-all">{error.digest}</code>
          </p>
        ) : undefined
      }
      primaryAction={{ label: "Tentar novamente", onClick: unstable_retry }}
      title="Não foi possível carregar esta área"
      tone="error"
    />
  );
}
