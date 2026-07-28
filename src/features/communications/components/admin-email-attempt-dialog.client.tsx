"use client";

import { AlertCircle, Clock3, History, RotateCcw } from "lucide-react";
import { useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";

import {
  formatAdminEmailTimestamp,
  getAdminEmailAttemptOutcomeLabel,
  getAdminEmailRetryExplanation,
} from "../domain/admin-email-outbox-presentation";
import { useAdminEmailOutboxDetail } from "../hooks/use-admin-email-outbox";
import type { AdminEmailOutboxDetailDto } from "../types/admin-email-outbox.types";

type DetailQuery =
  | { status: "error"; retry?: () => void }
  | { status: "loading" }
  | { data: AdminEmailOutboxDetailDto; status: "success" };

export function AdminEmailAttemptDialogView({
  onOpenChange,
  open,
  query,
  reference,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  query: DetailQuery;
  reference: string;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger
        render={
          <Button
            aria-label={`Ver tentativas de ${reference}`}
            size="sm"
            type="button"
            variant="outline"
          >
            <History aria-hidden="true" />
            Ver tentativas
          </Button>
        }
      />
      <DialogContent className="max-h-[min(42rem,calc(100dvh-2rem))] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de tentativas</DialogTitle>
          <DialogDescription>
            Dados operacionais minimizados de {reference}. Endereço, conteúdo e
            identificadores do provedor não são exibidos.
          </DialogDescription>
        </DialogHeader>

        {query.status === "loading" ? (
          <div aria-live="polite" className="space-y-3" role="status">
            <span className="sr-only">Carregando histórico de tentativas</span>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {query.status === "error" ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Histórico indisponível</AlertTitle>
            <AlertDescription>
              Atualize os dados antes de tomar uma decisão operacional.
            </AlertDescription>
            <Button
              className="mt-3 w-fit"
              onClick={() => query.retry?.()}
              size="sm"
              type="button"
              variant="outline"
            >
              <RotateCcw aria-hidden="true" />
              Tentar carregar novamente
            </Button>
          </Alert>
        ) : null}

        {query.status === "success" ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-slate-50 p-4 text-sm leading-6 text-slate-800">
              {getAdminEmailRetryExplanation(query.data.item.retry)}
            </div>

            {query.data.attempts.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border p-4">
                Nenhuma tentativa foi registrada para esta mensagem.
              </p>
            ) : (
              <ol aria-label="Tentativas de envio" className="space-y-3">
                {query.data.attempts.map((attempt) => (
                  <li
                    className="rounded-xl border p-4"
                    key={attempt.attemptNumber}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">
                        Tentativa {attempt.attemptNumber}
                      </p>
                      <Badge
                        variant={
                          attempt.status === "SENT" ? "default" : "destructive"
                        }
                      >
                        {getAdminEmailAttemptOutcomeLabel(attempt.outcome)}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 aria-hidden="true" className="size-4" />
                        {formatAdminEmailTimestamp(attempt.attemptedAt)}
                      </span>
                      <span>
                        Latência:{" "}
                        {attempt.latencyMs === null
                          ? "não informada"
                          : `${attempt.latencyMs} ms`}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function AdminEmailAttemptDialog({
  outboxId,
  reference,
}: {
  outboxId: string;
  reference: string;
}) {
  const [open, setOpen] = useState(false);
  const query = useAdminEmailOutboxDetail(open ? outboxId : null);

  return (
    <AdminEmailAttemptDialogView
      onOpenChange={setOpen}
      open={open}
      query={
        query.isPending && query.fetchStatus !== "idle"
          ? { status: "loading" }
          : query.isError
            ? { retry: () => void query.refetch(), status: "error" }
            : query.data
              ? { data: query.data, status: "success" }
              : { status: "loading" }
      }
      reference={reference}
    />
  );
}
