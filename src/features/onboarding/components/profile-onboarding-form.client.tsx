"use client";

import { CircleAlert } from "lucide-react";
import { useActionState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { RequiredFieldsNotice } from "@/shared/components/ui/field";
import { Spinner } from "@/shared/components/ui/spinner";
import { useRequiredFieldValidation } from "@/shared/hooks/use-required-field-validation";

import type { OnboardingAction } from "../types/onboarding-action.types";
import { initialOnboardingActionState } from "../types/onboarding-action.types";
import { ProfileFormFields } from "./profile-form-fields.client";

export function ProfileOnboardingForm({
  action,
  role,
}: {
  action: OnboardingAction;
  role: "INFLUENCER" | "COMPANY";
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialOnboardingActionState,
  );
  const formValidation = useRequiredFieldValidation();

  return (
    <form
      action={formAction}
      className="space-y-9"
      noValidate
      {...formValidation.formValidationProps}
    >
      <input name="role" type="hidden" value={role} />
      {state.message ? (
        <Alert aria-live="polite" variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Não foi possível enviar</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <RequiredFieldsNotice />
      <ProfileFormFields
        fieldErrors={state.fieldErrors}
        getFieldErrors={formValidation.getFieldErrors}
        onFieldChange={formValidation.clearFieldError}
        role={role}
      />
      <Button className="w-full" disabled={pending} size="lg" type="submit">
        {pending ? <Spinner aria-label="Enviando perfil" /> : null}
        {pending ? "Enviando para análise..." : "Enviar perfil para análise"}
      </Button>
    </form>
  );
}
