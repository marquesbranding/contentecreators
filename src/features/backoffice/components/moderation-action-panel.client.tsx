"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Archive,
  Ban,
  Check,
  CircleOff,
  RotateCcw,
  ShieldCheck,
  UserRoundCheck,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { ActionSubmitButton } from "@/shared/components/action-submit-button";
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

import { moderationQueueKeys } from "../api/moderation-queue.api";
import {
  getAvailableModerationActions,
  type BackofficeAccountStatus,
  type BackofficeModerationAction,
} from "../domain/moderation-presentation";
import { BackofficeActionFeedback } from "./backoffice-action-feedback";

interface ModerationActionState {
  code?:
    | "ADMIN_REQUIRED"
    | "CONFIRMATION_REQUIRED"
    | "IDEMPOTENCY_CONFLICT"
    | "INVALID_TRANSITION"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "SELF_APPROVAL_FORBIDDEN"
    | "STALE_REVIEW"
    | "UNKNOWN"
    | "VALIDATION_ERROR";
  fieldErrors?: Partial<
    Record<
      | "accountId"
      | "confirmation"
      | "expectedAccountVersion"
      | "expectedProfileVersion"
      | "idempotencyKey"
      | "reason",
      string[] | undefined
    >
  >;
  message?: string;
  status: "conflict" | "error" | "idle" | "success" | "unauthorized";
}

type ModerationServerAction = (
  previousState: ModerationActionState,
  formData: FormData,
) => Promise<ModerationActionState>;

export type ModerationServerActions = Record<
  BackofficeModerationAction,
  ModerationServerAction
>;

const initialState: ModerationActionState = { status: "idle" };

const actionConfig: Record<
  BackofficeModerationAction,
  {
    consequence: string;
    icon: typeof Check;
    label: string;
    reasonLabel?: string;
    submitLabel: string;
    tone: "default" | "destructive" | "outline";
  }
> = {
  APPROVE: {
    consequence:
      "O perfil ficará elegível ao catálogo e o usuário receberá a comunicação de aprovação.",
    icon: Check,
    label: "Aprovar cadastro",
    submitLabel: "Confirmar aprovação",
    tone: "default",
  },
  ARCHIVE: {
    consequence:
      "O cadastro sairá das listagens operacionais, mas seu histórico e auditoria serão preservados.",
    icon: Archive,
    label: "Arquivar cadastro",
    reasonLabel: "Motivo para arquivar",
    submitLabel: "Confirmar arquivamento",
    tone: "outline",
  },
  BAN: {
    consequence:
      "O acesso será bloqueado, sessões serão revogadas quando suportado e a identidade conhecida não poderá recriar a conta.",
    icon: Ban,
    label: "Banir cadastro",
    reasonLabel: "Motivo para banir",
    submitLabel: "Confirmar banimento",
    tone: "destructive",
  },
  REQUEST_CHANGES: {
    consequence:
      "O usuário verá o motivo, poderá corrigir o cadastro e precisará reenviá-lo para uma nova análise.",
    icon: Wrench,
    label: "Solicitar correções",
    reasonLabel: "Motivo para solicitar correções",
    submitLabel: "Enviar solicitação",
    tone: "outline",
  },
  RESTORE: {
    consequence:
      "O perfil voltará ao catálogo e recuperará o acesso permitido para contas aprovadas.",
    icon: UserRoundCheck,
    label: "Restaurar acesso",
    reasonLabel: "Motivo para restaurar",
    submitLabel: "Confirmar restauração",
    tone: "default",
  },
  SUSPEND: {
    consequence:
      "O perfil sairá imediatamente do catálogo e perderá o acesso até uma restauração administrativa.",
    icon: CircleOff,
    label: "Suspender cadastro",
    reasonLabel: "Motivo para suspender",
    submitLabel: "Confirmar suspensão",
    tone: "destructive",
  },
  UNBAN: {
    consequence:
      "Esta recuperação excepcional removerá o bloqueio e restaurará exatamente o estado anterior ao banimento.",
    icon: RotateCcw,
    label: "Remover banimento",
    reasonLabel: "Motivo para remover o banimento",
    submitLabel: "Confirmar recuperação",
    tone: "destructive",
  },
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <ActionSubmitButton
      idleIcon={<ShieldCheck aria-hidden="true" />}
      pending={pending}
      pendingLabel="Aplicando decisão..."
    >
      {label}
    </ActionSubmitButton>
  );
}

function ActionDialog({
  accountId,
  accountVersion,
  action,
  displayName,
  profileVersion,
  serverAction,
}: {
  accountId: string;
  accountVersion: number;
  action: BackofficeModerationAction;
  displayName: string;
  profileVersion: number;
  serverAction: ModerationServerAction;
}) {
  const config = actionConfig[action];
  const Icon = config.icon;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [idempotencyKey] = useState(
    () => `moderation:${action.toLowerCase()}:${crypto.randomUUID()}`,
  );
  const [state, formAction] = useActionState(serverAction, initialState);
  useActionSuccessToast(state, {
    title: "Decisão aplicada",
  });
  const reasonErrors = state.fieldErrors?.reason;
  const confirmationErrors = state.fieldErrors?.confirmation;

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: moderationQueueKeys.lists(),
    });
    router.refresh();
  }, [queryClient, router, state.status]);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant={config.tone}>
            <Icon aria-hidden="true" />
            {config.label}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{config.label}</DialogTitle>
          <DialogDescription>
            Revise a consequência desta decisão para {displayName}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          {config.consequence}
        </div>

        <form action={formAction} className="space-y-5">
          <input name="accountId" type="hidden" value={accountId} />
          <input
            name="expectedAccountVersion"
            type="hidden"
            value={accountVersion}
          />
          <input
            name="expectedProfileVersion"
            type="hidden"
            value={profileVersion}
          />
          <input name="idempotencyKey" type="hidden" value={idempotencyKey} />

          {config.reasonLabel ? (
            <Field data-invalid={Boolean(reasonErrors?.length)}>
              <FieldLabel htmlFor={`${action}-reason`} required>
                {config.reasonLabel}
              </FieldLabel>
              <Textarea
                aria-describedby={`${action}-reason-error`}
                aria-invalid={Boolean(reasonErrors?.length)}
                className="min-h-28"
                id={`${action}-reason`}
                maxLength={2_000}
                name="reason"
                placeholder="Registre um motivo objetivo e adequado para o histórico."
                required
              />
              <FieldError id={`${action}-reason-error`}>
                {reasonErrors?.join(" ")}
              </FieldError>
            </Field>
          ) : null}

          <Field
            data-invalid={Boolean(confirmationErrors?.length)}
            orientation="horizontal"
          >
            <Checkbox
              aria-invalid={Boolean(confirmationErrors?.length)}
              id={`${action}-confirmation`}
              name="confirmation"
              required
              value="confirmed"
            />
            <div>
              <FieldLabel htmlFor={`${action}-confirmation`} required>
                Confirmo que revisei o cadastro e compreendo a consequência.
              </FieldLabel>
              <FieldError>{confirmationErrors?.join(" ")}</FieldError>
            </div>
          </Field>

          <RequiredFieldsNotice />

          {state.status !== "idle" && state.message ? (
            <BackofficeActionFeedback
              kind={state.status === "success" ? "success" : "error"}
              message={state.message}
              title={
                state.status === "conflict"
                  ? "A revisão ficou desatualizada"
                  : undefined
              }
            />
          ) : null}

          {state.status === "conflict" ? (
            <Button
              onClick={() => router.refresh()}
              type="button"
              variant="outline"
            >
              <RotateCcw aria-hidden="true" />
              Recarregar revisão
            </Button>
          ) : null}

          <DialogFooter>
            <SubmitButton label={config.submitLabel} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ModerationActionPanel({
  accountId,
  accountVersion,
  actions,
  displayName,
  profileVersion,
  status,
}: {
  accountId: string;
  accountVersion: number;
  actions: ModerationServerActions;
  displayName: string;
  profileVersion: number;
  status: BackofficeAccountStatus;
}) {
  const availableActions = getAvailableModerationActions(status);

  return (
    <aside
      aria-labelledby="moderation-actions-title"
      className="rounded-2xl bg-white p-5 ring-1 ring-black/8"
    >
      <h2
        className="text-xl font-extrabold tracking-[-0.025em]"
        id="moderation-actions-title"
      >
        Decisão administrativa
      </h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        Cada comando é individual, versionado e registrado na auditoria.
      </p>
      <div className="mt-5 grid gap-3">
        {availableActions.map((action) => (
          <ActionDialog
            accountId={accountId}
            accountVersion={accountVersion}
            action={action}
            displayName={displayName}
            key={action}
            profileVersion={profileVersion}
            serverAction={actions[action]}
          />
        ))}
      </div>
    </aside>
  );
}
