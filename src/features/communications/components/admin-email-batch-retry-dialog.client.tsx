"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { ActionSubmitButton } from "@/shared/components/action-submit-button";
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
import { useActionSuccessToast } from "@/shared/hooks/use-action-success-toast";

import { adminEmailOutboxKeys } from "../api/admin-email-outbox.api";

export interface AdminEmailBatchRetryActionState {
  message?: string;
  status: "error" | "idle" | "success";
}

export type AdminEmailBatchRetryAction = (
  previousState: AdminEmailBatchRetryActionState,
  formData: FormData,
) => Promise<AdminEmailBatchRetryActionState>;

export interface AdminEmailBatchRetryItem {
  id: string;
  recipientEmail: string;
  reference: string;
}

const initialState: AdminEmailBatchRetryActionState = { status: "idle" };

function SubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();

  return (
    <ActionSubmitButton
      idleIcon={<ShieldCheck aria-hidden="true" />}
      pending={pending}
      pendingLabel="Programando tentativas..."
    >
      Confirmar {count} reenvios
    </ActionSubmitButton>
  );
}

export function AdminEmailBatchRetryDialog({
  action,
  items,
  onSuccess,
}: {
  action: AdminEmailBatchRetryAction;
  items: AdminEmailBatchRetryItem[];
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [state, formAction] = useActionState(action, initialState);
  useActionSuccessToast(state, {
    title: "Reenvios programados",
  });

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: adminEmailOutboxKeys.lists(),
    });
    onSuccess?.();
  }, [onSuccess, queryClient, state.status]);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            aria-label={`Reenviar ${items.length} e-mails selecionados`}
            disabled={items.length === 0}
            size="sm"
            type="button"
          >
            <RefreshCw aria-hidden="true" />
            Reenviar selecionados ({items.length})
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Programar reenvio em lote</DialogTitle>
          <DialogDescription>
            Confirme a intervenção operacional nos {items.length} e-mails
            selecionados abaixo.
          </DialogDescription>
        </DialogHeader>

        <ul
          aria-label="Destinatários selecionados para reenvio"
          className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-3 text-sm"
        >
          {items.map((item) => (
            <li className="flex flex-wrap justify-between gap-2" key={item.id}>
              <span className="font-medium">{item.reference}</span>
              <span className="text-muted-foreground">
                {item.recipientEmail}
              </span>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Esta ação não cria novas mensagens. Ela reutiliza os mesmos itens
          idempotentes, libera uma tentativa adicional para cada um e registra o
          mesmo motivo na auditoria de todos eles.
        </div>

        <form action={formAction} className="space-y-5">
          {items.map((item) => (
            <input
              key={item.id}
              name="outboxId"
              type="hidden"
              value={item.id}
            />
          ))}

          <Field>
            <FieldLabel htmlFor="batch-retry-reason" required>
              Motivo do reenvio
            </FieldLabel>
            <Textarea
              className="min-h-28"
              id="batch-retry-reason"
              maxLength={500}
              minLength={3}
              name="reason"
              placeholder="Descreva a correção ou verificação realizada antes das novas tentativas."
              required
            />
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id="batch-retry-confirmation"
              name="confirmation"
              required
              value="confirmed"
            />
            <div>
              <FieldLabel htmlFor="batch-retry-confirmation" required>
                Confirmo que investiguei as falhas e compreendo que todas as
                tentativas serão auditadas.
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
                  ? "Reenvios não programados"
                  : "Solicitação concluída"}
              </AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter showCloseButton>
            <SubmitButton count={items.length} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
