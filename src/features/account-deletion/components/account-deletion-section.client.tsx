"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ActionSubmitButton } from "@/shared/components/action-submit-button";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
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
      className="w-full sm:w-auto"
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
        Exclui seu perfil, fotos e dados agora. Não dá para desfazer. Para usar
        a plataforma de novo, faça um novo cadastro. Veja a{" "}
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-w-lg sm:p-6">
          <form action={formAction} className="grid gap-5">
            <DialogHeader className="flex-row items-start gap-3 pr-10">
              <span className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-full">
                <Trash2 aria-hidden="true" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogTitle className="text-lg leading-tight font-extrabold">
                  Excluir minha conta
                </DialogTitle>
                <DialogDescription className="leading-6">
                  Digite {DELETION_CONFIRMATION_PHRASE} para confirmar.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div
              className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-3 rounded-xl border-2 p-4"
              role="alert"
            >
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
              />
              <div className="flex flex-col gap-2 text-sm leading-6">
                <p className="font-bold">
                  Atenção: seus dados serão excluídos de fato, agora.
                </p>
                <p className="font-medium">
                  Para usar o sistema de novo, será preciso se cadastrar do
                  zero.
                </p>
              </div>
            </div>

            {state.status === "error" && state.message ? (
              <p
                className="border-destructive/40 bg-destructive/5 text-destructive rounded-xl border p-3 text-sm font-medium"
                role="alert"
              >
                {state.message}
              </p>
            ) : null}

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
                className="border-input hover:bg-muted/50 has-[[aria-invalid=true]]:border-destructive/40 has-[[aria-invalid=true]]:bg-destructive/5 has-[:focus-visible]:ring-ring/50 flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 transition-colors has-[:focus-visible]:ring-3"
                htmlFor="deletion-ack"
              >
                <input
                  aria-invalid={Boolean(errors?.acknowledged?.length)}
                  className="accent-destructive mt-1 size-4 shrink-0 cursor-pointer"
                  id="deletion-ack"
                  name="acknowledged"
                  required
                  type="checkbox"
                />
                <span className="font-medium">
                  Entendo que os dados serão apagados e não podem ser
                  recuperados.
                </span>
              </label>
              <FieldError
                errors={errors?.acknowledged?.map((message) => ({ message }))}
              />
            </Field>

            <DialogFooter className="-mx-5 -mb-5 p-5 sm:-mx-6 sm:-mb-6 sm:p-6">
              <DialogClose
                render={
                  <Button
                    className="w-full sm:w-auto"
                    type="button"
                    variant="outline"
                  />
                }
              >
                Cancelar
              </DialogClose>
              <SubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
