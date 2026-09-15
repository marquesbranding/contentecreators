"use client";
import { useActionFeedback } from "@/shared/hooks/use-action-feedback";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import type {
  RegistrationStepAction,
  RegistrationStepState,
} from "../types/registration-step.types";

export function RegistrationVerifyStep({
  action,
  resendAction,
  maskedEmail,
  mailboxUrl,
}: {
  action: RegistrationStepAction;
  resendAction: () => Promise<RegistrationStepState>;
  maskedEmail: string;
  mailboxUrl?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });
  const { errorAlertRef } = useActionFeedback(state, {
    title: "Cadastro atualizado",
  });
  const [remaining, setRemaining] = useState(60);
  const [code, setCode] = useState("");
  const [resendState, setResendState] = useState<RegistrationStepState>({
    status: "idle",
  });
  const [resending, startTransition] = useTransition();
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Enviamos um código para <strong>{maskedEmail}</strong>. Você também pode
        clicar no link que enviamos.
      </p>
      <form action={formAction} className="space-y-5">
        <Field>
          <FieldLabel htmlFor="registration-code" required>
            Código de 6 dígitos
          </FieldLabel>
          <Input
            id="registration-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            aria-invalid={state.status === "error"}
          />
        </Field>
        {state.message ? (
          <div
            ref={errorAlertRef}
            tabIndex={-1}
            role="alert"
            className="text-destructive text-sm"
          >
            {state.message}
          </div>
        ) : null}
        <ActionSubmitButton
          className="w-full"
          pending={pending}
          disabled={code.length !== 6}
          pendingLabel="Confirmando..."
        >
          Confirmar
        </ActionSubmitButton>
      </form>
      <Button
        className="w-full"
        variant="outline"
        disabled={remaining > 0 || resending}
        onClick={() =>
          startTransition(async () => {
            setResendState(await resendAction());
            setRemaining(60);
          })
        }
      >
        {remaining ? `Reenviar código em ${remaining}s` : "Reenviar código"}
      </Button>
      {resendState.message ? (
        <p role="status" className="text-sm">
          {resendState.message}
        </p>
      ) : null}
      <Link
        className="text-brand-blue block text-center text-sm font-semibold"
        href="/sign-up"
      >
        Trocar e-mail
      </Link>
      {mailboxUrl ? (
        <a
          className="text-brand-blue block text-center text-sm"
          href={mailboxUrl}
          target="_blank"
          rel="noreferrer"
        >
          Abrir caixa de e-mails local
        </a>
      ) : null}
    </div>
  );
}
