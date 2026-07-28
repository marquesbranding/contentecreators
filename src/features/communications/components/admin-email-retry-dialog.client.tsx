"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldLabel,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Textarea } from "@/shared/components/ui/textarea";

import { adminEmailOutboxKeys } from "../api/admin-email-outbox.api";

export interface AdminEmailRetryActionState {
  message?: string;
  status: "error" | "idle" | "success";
}

export type AdminEmailRetryAction = (
  previousState: AdminEmailRetryActionState,
  formData: FormData,
) => Promise<AdminEmailRetryActionState>;

const initialState: AdminEmailRetryActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      <ShieldCheck aria-hidden="true" />
      {pending ? "Processando..." : "Confirmar nova tentativa"}
    </Button>
  );
}

export function AdminEmailRetryDialog({
  action,
  outboxId,
  reference,
}: {
  action: AdminEmailRetryAction;
  outboxId: string;
  reference: string;
}) {
  const queryClient = useQueryClient();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminEmailOutboxKeys.lists(),
      }),
      queryClient.invalidateQueries({
        queryKey: adminEmailOutboxKeys.detail(outboxId),
      }),
    ]);
  }, [outboxId, queryClient, state.status]);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            aria-label={`Tentar novamente ${reference}`}
            size="sm"
            type="button"
          >
            <RefreshCw aria-hidden="true" />
            Tentar novamente
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Programar nova tentativa</DialogTitle>
          <DialogDescription>
            Confirme a intervenção operacional em {reference}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Esta ação não cria uma nova mensagem. Ela reutiliza o mesmo item
          idempotente, libera uma tentativa adicional e registra o motivo na
          auditoria.
        </div>

        <form action={formAction} className="space-y-5">
          <input name="outboxId" type="hidden" value={outboxId} />

          <Field>
            <FieldLabel htmlFor={`retry-reason-${outboxId}`} required>
              Motivo do reenvio
            </FieldLabel>
            <Textarea
              className="min-h-28"
              id={`retry-reason-${outboxId}`}
              maxLength={500}
              minLength={3}
              name="reason"
              placeholder="Descreva a correção ou verificação realizada antes da nova tentativa."
              required
            />
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id={`retry-confirmation-${outboxId}`}
              name="confirmation"
              required
              value="confirmed"
            />
            <div>
              <FieldLabel htmlFor={`retry-confirmation-${outboxId}`} required>
                Confirmo que investiguei a falha e compreendo que a tentativa
                será auditada.
              </FieldLabel>
              <FieldError />
            </div>
          </Field>

          <RequiredFieldsNotice />

          {state.status !== "idle" && state.message ? (
            <Alert
              aria-live={state.status === "error" ? "assertive" : "polite"}
              role={state.status === "error" ? "alert" : "status"}
              variant={state.status === "error" ? "destructive" : "default"}
            >
              <RefreshCw aria-hidden="true" />
              <AlertTitle>
                {state.status === "error"
                  ? "Nova tentativa não programada"
                  : "Solicitação concluída"}
              </AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter showCloseButton>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
