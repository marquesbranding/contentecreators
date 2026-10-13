"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Textarea } from "@/shared/components/ui/textarea";

import type { RecoverAccountActionState } from "../types/account-deletion.types";

export type RecoverAccountServerAction = (
  previousState: RecoverAccountActionState,
  formData: FormData,
) => Promise<RecoverAccountActionState>;

const initialState: RecoverAccountActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <ActionSubmitButton
      idleIcon={<RotateCcw aria-hidden="true" />}
      pending={pending}
      pendingLabel="Recuperando..."
    >
      Recuperar conta
    </ActionSubmitButton>
  );
}

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(isoDate));
}

export function RecoverAccountPanel({
  accountId,
  action,
  deletionDueAt,
  deletionState,
  eliminationEligibleAt,
  recoverable,
}: {
  accountId: string;
  action: RecoverAccountServerAction;
  deletionDueAt: string;
  deletionState: "ELIMINATED" | "FAILED" | "REQUESTED";
  eliminationEligibleAt: string;
  recoverable: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <section
      aria-labelledby="deletion-panel-heading"
      className="border-destructive/40 rounded-2xl border p-5"
    >
      <h2 className="text-lg font-extrabold" id="deletion-panel-heading">
        Exclusão solicitada pelo titular
      </h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Recuperável até</dt>
          <dd className="font-medium">{formatDate(eliminationEligibleAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Prazo legal de eliminação</dt>
          <dd className="font-medium">{formatDate(deletionDueAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estado da rotina</dt>
          <dd className="font-medium">
            {deletionState === "REQUESTED"
              ? "Aguardando"
              : deletionState === "FAILED"
                ? "Falhou, nova tentativa automática"
                : "Dados eliminados"}
          </dd>
        </div>
      </dl>

      {recoverable ? (
        <form action={formAction} className="mt-4 grid gap-3">
          <input name="accountId" type="hidden" value={accountId} />
          <Field data-invalid={Boolean(state.fieldErrors?.reason?.length)}>
            <FieldLabel htmlFor="recovery-reason">
              Motivo da recuperação
            </FieldLabel>
            <Textarea
              id="recovery-reason"
              name="reason"
              placeholder="Ex.: titular pediu a recuperação por e-mail."
              required
            />
            <FieldError
              errors={state.fieldErrors?.reason?.map((message) => ({
                message,
              }))}
            />
          </Field>
          <p className="text-muted-foreground text-xs leading-5">
            O acesso e o perfil voltam ao estado anterior. A autorização de
            contato continua revogada até o titular autorizar de novo.
          </p>
          {state.message ? (
            <p
              className={
                state.status === "error"
                  ? "text-destructive text-sm"
                  : "text-sm"
              }
              role={state.status === "error" ? "alert" : "status"}
            >
              {state.message}
            </p>
          ) : null}
          <div>
            <SubmitButton />
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          A janela de recuperação terminou. Esta conta não pode mais ser
          recuperada.
        </p>
      )}
    </section>
  );
}
