"use client";

import { CircleAlert, CircleCheck, UserRoundPlus } from "lucide-react";
import { useActionState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  RequiredFieldsNotice,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useActionSuccessToast } from "@/shared/hooks/use-action-success-toast";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";

import type { AdminProvisioningAction } from "../types/admin-provisioning.types";
import { initialAdminProvisioningActionState } from "../types/admin-provisioning.types";
import { AuthSubmitButton } from "./auth-submit-button";

export function AdminProvisioningForm({
  action,
}: {
  action: AdminProvisioningAction;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAdminProvisioningActionState,
  );
  useActionSuccessToast(state, {
    title: "Administrador provisionado",
  });
  const validation = useRequiredFieldValidation();
  const emailErrors = validation.getFieldErrors(
    "email",
    state.fieldErrors?.email,
  );
  const reasonErrors = validation.getFieldErrors(
    "reason",
    state.fieldErrors?.reason,
  );
  const emailErrorId = emailErrors?.length
    ? "admin-provisioning-email-error"
    : undefined;
  const reasonErrorId = reasonErrors?.length
    ? "admin-provisioning-reason-error"
    : undefined;

  return (
    <div className="space-y-5">
      {state.message ? (
        <Alert
          aria-live="polite"
          className={
            state.status === "success"
              ? "border-[#138a5b]/30 bg-[#138a5b]/5"
              : undefined
          }
          variant={state.status === "error" ? "destructive" : "default"}
        >
          {state.status === "success" ? (
            <CircleCheck aria-hidden="true" className="text-[#138a5b]" />
          ) : (
            <CircleAlert aria-hidden="true" />
          )}
          <AlertTitle>
            {state.status === "success"
              ? "Administrador provisionado"
              : "Não foi possível provisionar"}
          </AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={formAction} noValidate {...validation.formValidationProps}>
        <FieldGroup>
          <RequiredFieldsNotice />
          <Field data-invalid={Boolean(emailErrors?.length)}>
            <FieldLabel htmlFor="admin-provisioning-email" required>
              E-mail do administrador
            </FieldLabel>
            <Input
              aria-describedby={emailErrorId}
              aria-invalid={Boolean(emailErrors?.length)}
              autoComplete="email"
              className="rounded-xl"
              id="admin-provisioning-email"
              inputMode="email"
              name="email"
              placeholder="admin@empresa.com.br"
              required
              type="email"
            />
            <FieldError id={emailErrorId}>
              {emailErrors?.map((message) => (
                <span className="block" key={message}>
                  {message}
                </span>
              ))}
            </FieldError>
          </Field>

          <Field data-invalid={Boolean(reasonErrors?.length)}>
            <FieldLabel htmlFor="admin-provisioning-reason" required>
              Motivo
            </FieldLabel>
            <Textarea
              aria-describedby={reasonErrorId}
              aria-invalid={Boolean(reasonErrors?.length)}
              className="min-h-28 rounded-xl"
              id="admin-provisioning-reason"
              maxLength={500}
              name="reason"
              placeholder="Registre quem aprovou este acesso e por quê."
              required
            />
            <FieldError id={reasonErrorId}>
              {reasonErrors?.map((message) => (
                <span className="block" key={message}>
                  {message}
                </span>
              ))}
            </FieldError>
          </Field>

          <AuthSubmitButton pending={pending} pendingLabel="Provisionando...">
            <UserRoundPlus aria-hidden="true" />
            Provisionar administrador
          </AuthSubmitButton>
        </FieldGroup>
      </form>
    </div>
  );
}
