"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";

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
    <section className="mx-auto max-w-2xl py-8 sm:py-12">
      <Alert className="gap-3 rounded-2xl p-5" variant="destructive">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5" />
        <AlertTitle>
          <h1 className="text-lg font-bold">
            Não foi possível carregar esta área
          </h1>
        </AlertTitle>
        <AlertDescription className="space-y-4">
          <p>
            Ocorreu uma falha inesperada. Tente carregar novamente. Se o
            problema continuar, informe o suporte.
          </p>
          {error.digest ? (
            <p className="text-xs">
              Referência para o suporte:{" "}
              <code className="font-mono break-all">{error.digest}</code>
            </p>
          ) : null}
          <Button onClick={unstable_retry} type="button" variant="outline">
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    </section>
  );
}
