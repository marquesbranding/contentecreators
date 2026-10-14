"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import { Button } from "@/shared/components/ui/button";
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
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";

import { DELETION_CONFIRMATION_PHRASE } from "../domain/deletion-policy";
import type { AccountDeletionActionState } from "../types/account-deletion.types";

export type AccountDeletionServerAction = (
  previousState: AccountDeletionActionState,
  formData: FormData,
) => Promise<AccountDeletionActionState>;

const initialState: AccountDeletionActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <ActionSubmitButton
      idleIcon={<Trash2 aria-hidden="true" />}
      pending={pending}
      pendingLabel="Excluindo..."
      variant="destructive"
    >
      Excluir minha conta
    </ActionSubmitButton>
  );
}

export function AccountDeletionSection({
  action,
}: {
  action: AccountDeletionServerAction;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.fieldErrors;

  return (
    <section
      aria-labelledby="account-deletion-heading"
      className="border-destructive/40 rounded-2xl border p-5 sm:p-6"
    >
      <h2
        className="text-destructive text-lg font-extrabold"
        id="account-deletion-heading"
      >
        Excluir conta
      </h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        A exclusão é imediata e não pode ser desfeita: seu perfil sai do
        catálogo e da página inicial na hora, e apagamos seus dados, fotos e
        rascunhos. Guardamos apenas o que a lei exige (por exemplo, registros de
        acesso por 6 meses e a comprovação dos seus aceites), sem seu nome nem
        seu e-mail. Se quiser voltar depois, é só se cadastrar de novo. Veja a{" "}
        <a className="text-brand-blue font-semibold underline" href="/privacy">
          Política de Privacidade
        </a>
        .
      </p>

      <Dialog>
        <DialogTrigger
          render={
            <Button className="mt-4" type="button" variant="destructive">
              <Trash2 aria-hidden="true" />
              Excluir minha conta
            </Button>
          }
        />
        <DialogContent className="sm:max-w-lg">
          <form action={formAction} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Excluir minha conta</DialogTitle>
              <DialogDescription>
                A exclusão é imediata e não pode ser desfeita; se quiser voltar,
                é só se cadastrar de novo. Para confirmar, informe sua senha e
                digite {DELETION_CONFIRMATION_PHRASE}.
              </DialogDescription>
            </DialogHeader>

            {state.status === "error" && state.message ? (
              <p
                className="border-destructive/40 bg-destructive/5 text-destructive rounded-xl border p-3 text-sm"
                role="alert"
              >
                {state.message}
              </p>
            ) : null}

            <Field data-invalid={Boolean(errors?.password?.length)}>
              <FieldLabel htmlFor="deletion-password">Senha</FieldLabel>
              <Input
                aria-invalid={Boolean(errors?.password?.length)}
                autoComplete="current-password"
                id="deletion-password"
                name="password"
                type="password"
              />
              <FieldDescription>
                Se você entra com o Google, deixe em branco (é preciso ter
                entrado há no máximo 5 minutos).
              </FieldDescription>
              <FieldError
                errors={errors?.password?.map((message) => ({ message }))}
              />
            </Field>

            <Field data-invalid={Boolean(errors?.confirmation?.length)}>
              <FieldLabel htmlFor="deletion-confirmation">
                Digite {DELETION_CONFIRMATION_PHRASE} para confirmar
              </FieldLabel>
              <Input
                aria-invalid={Boolean(errors?.confirmation?.length)}
                autoComplete="off"
                id="deletion-confirmation"
                name="confirmation"
                required
              />
              <FieldError
                errors={errors?.confirmation?.map((message) => ({ message }))}
              />
            </Field>

            <Field data-invalid={Boolean(errors?.acknowledged?.length)}>
              <label
                className="flex items-start gap-3 text-sm"
                htmlFor="deletion-ack"
              >
                <input
                  className="mt-1 size-4"
                  id="deletion-ack"
                  name="acknowledged"
                  required
                  type="checkbox"
                />
                <span>
                  Entendo que meu perfil e meus dados serão apagados agora e que
                  não há como recuperá-los.
                </span>
              </label>
              <FieldError
                errors={errors?.acknowledged?.map((message) => ({ message }))}
              />
            </Field>

            <DialogFooter>
              <SubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
