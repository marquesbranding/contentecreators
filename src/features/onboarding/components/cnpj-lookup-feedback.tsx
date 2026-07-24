"use client";

import {
  CircleCheck,
  Clock3,
  LoaderCircle,
  SearchX,
  TimerReset,
  TriangleAlert,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";

import type { CnpjLookupUiStatus } from "../hooks/use-cnpj-lookup";

type CnpjLookupFeedbackProps = {
  lookupStatus: CnpjLookupUiStatus;
  onApply: () => void;
  onRetry: () => void;
};

function ManualEntryMessage() {
  return (
    <p className="mt-2 font-medium">
      Preenchimento manual disponível. Você pode continuar normalmente.
    </p>
  );
}

export function CnpjLookupFeedback({
  lookupStatus,
  onApply,
  onRetry,
}: CnpjLookupFeedbackProps) {
  if (lookupStatus === "idle") {
    return null;
  }

  if (lookupStatus === "loading") {
    return (
      <Alert aria-live="polite">
        <LoaderCircle aria-hidden="true" className="animate-spin" />
        <AlertTitle>Consultando o CNPJ</AlertTitle>
        <AlertDescription>
          Buscando dados públicos para agilizar o preenchimento.
        </AlertDescription>
      </Alert>
    );
  }

  if (lookupStatus === "success") {
    return (
      <Alert aria-live="polite">
        <CircleCheck aria-hidden="true" className="text-emerald-600" />
        <AlertTitle>Dados encontrados</AlertTitle>
        <AlertDescription>
          Encontramos uma proposta de preenchimento. Revise e edite os campos
          antes de enviar.
          <Button className="mt-3" onClick={onApply} type="button">
            Preencher dados encontrados
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (lookupStatus === "not_found") {
    return (
      <Alert aria-live="polite">
        <SearchX aria-hidden="true" />
        <AlertTitle>CNPJ não encontrado</AlertTitle>
        <AlertDescription>
          Não encontramos dados públicos para este CNPJ.
          <ManualEntryMessage />
        </AlertDescription>
      </Alert>
    );
  }

  if (lookupStatus === "rate_limited") {
    return (
      <Alert aria-live="polite">
        <TimerReset aria-hidden="true" />
        <AlertTitle>Limite de consultas atingido</AlertTitle>
        <AlertDescription>
          Aguarde um minuto antes de consultar novamente.
          <ManualEntryMessage />
        </AlertDescription>
      </Alert>
    );
  }

  const timedOut = lookupStatus === "timeout";

  return (
    <Alert aria-live="polite">
      {timedOut ? (
        <Clock3 aria-hidden="true" />
      ) : (
        <TriangleAlert aria-hidden="true" />
      )}
      <AlertTitle>
        {timedOut
          ? "A consulta demorou mais que o esperado"
          : "Consulta automática indisponível"}
      </AlertTitle>
      <AlertDescription>
        {timedOut
          ? "A BrasilAPI não respondeu a tempo."
          : "Não foi possível consultar a BrasilAPI agora."}
        <ManualEntryMessage />
        <Button
          className="mt-3"
          onClick={onRetry}
          type="button"
          variant="outline"
        >
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  );
}
