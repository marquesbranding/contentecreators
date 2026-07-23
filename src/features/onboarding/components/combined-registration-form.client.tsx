"use client";

import { Building2, CircleAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/lib/cn";

import type { OnboardingAction } from "../types/onboarding-action.types";
import { initialOnboardingActionState } from "../types/onboarding-action.types";
import { ProfileFormFields } from "./profile-form-fields.client";

const roleOptions = [
  {
    description: "Quero cadastrar meu perfil, audiência e canais.",
    icon: UserRound,
    label: "Sou creator",
    value: "INFLUENCER",
  },
  {
    description: "Quero cadastrar minha empresa para encontrar creators.",
    icon: Building2,
    label: "Sou empresa",
    value: "COMPANY",
  },
] as const;

export function CombinedRegistrationForm({
  action,
  googleAction,
  initialRole,
  resendAction,
}: {
  action: OnboardingAction;
  googleAction: (formData: FormData) => Promise<void>;
  initialRole?: "INFLUENCER" | "COMPANY";
  resendAction: OnboardingAction;
}) {
  const [role, setRole] = useState<"INFLUENCER" | "COMPANY" | null>(
    initialRole ?? null,
  );
  const [state, formAction, pending] = useActionState(
    action,
    initialOnboardingActionState,
  );
  const [resendState, resendFormAction, resendPending] = useActionState(
    resendAction,
    initialOnboardingActionState,
  );

  if (state.status === "confirmation_required" && state.values?.email) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTitle>Confirme seu e-mail</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <p className="text-muted-foreground text-sm leading-6">
          Enviamos o link para{" "}
          <strong className="text-foreground">{state.values.email}</strong>. O
          perfil já foi preparado e entrará na fila de análise após a
          confirmação.
        </p>
        <form action={resendFormAction} className="space-y-3">
          <input name="email" type="hidden" value={state.values.email} />
          {resendState.message ? (
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {resendState.message}
            </p>
          ) : null}
          <Button
            className="w-full"
            disabled={resendPending}
            size="lg"
            type="submit"
            variant="outline"
          >
            {resendPending ? "Reenviando..." : "Reenviar confirmação"}
          </Button>
        </form>
        <Button
          nativeButton={false}
          render={<Link href="/login" />}
          variant="link"
        >
          Voltar para o login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {state.message ? (
        <Alert aria-live="polite" variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Revise seu cadastro</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={formAction} className="space-y-9" noValidate>
        <FieldSet>
          <FieldLegend>Como você vai usar a plataforma?</FieldLegend>
          <FieldDescription>
            Essa escolha define os dados do cadastro e não poderá ser alterada
            por você depois do envio.
          </FieldDescription>
          <Field data-invalid={Boolean(state.fieldErrors?.role)}>
            <RadioGroup
              className="grid gap-4 md:grid-cols-2"
              name="role"
              onValueChange={(value) => {
                if (value === "INFLUENCER" || value === "COMPANY") {
                  setRole(value);
                }
              }}
              value={role}
            >
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const selected = role === option.value;

                return (
                  <label
                    className={cn(
                      "focus-within:ring-ring/40 flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition-colors focus-within:ring-3",
                      selected
                        ? "border-brand-blue bg-brand-blue-soft"
                        : "border-border hover:border-brand-blue/40",
                    )}
                    htmlFor={`registration-${option.value.toLowerCase()}`}
                    key={option.value}
                    onClick={() => setRole(option.value)}
                  >
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl",
                        selected
                          ? "bg-brand-blue text-white"
                          : "bg-muted text-foreground",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong
                        className="block"
                        id={`registration-${option.value.toLowerCase()}-title`}
                      >
                        {option.label}
                      </strong>
                      <span
                        className="text-muted-foreground mt-1 block text-sm leading-5"
                        id={`registration-${option.value.toLowerCase()}-description`}
                      >
                        {option.description}
                      </span>
                    </span>
                    <RadioGroupItem
                      aria-describedby={`registration-${option.value.toLowerCase()}-description`}
                      aria-labelledby={`registration-${option.value.toLowerCase()}-title`}
                      id={`registration-${option.value.toLowerCase()}`}
                      value={option.value}
                    />
                  </label>
                );
              })}
            </RadioGroup>
            <FieldError>{state.fieldErrors?.role?.[0]}</FieldError>
          </Field>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Dados de acesso</FieldLegend>
          <FieldDescription>
            Você usará este e-mail para entrar e acompanhar a análise.
          </FieldDescription>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field
              className="md:col-span-2"
              data-invalid={Boolean(state.fieldErrors?.email)}
            >
              <FieldLabel htmlFor="registration-email">E-mail</FieldLabel>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.email)}
                autoComplete="email"
                className="h-12 rounded-xl"
                id="registration-email"
                inputMode="email"
                name="email"
                placeholder="voce@exemplo.com"
                required
                type="email"
              />
              <FieldError>{state.fieldErrors?.email?.[0]}</FieldError>
            </Field>
            <Field data-invalid={Boolean(state.fieldErrors?.password)}>
              <FieldLabel htmlFor="registration-password">Senha</FieldLabel>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.password)}
                autoComplete="new-password"
                className="h-12 rounded-xl"
                id="registration-password"
                name="password"
                required
                type="password"
              />
              <FieldDescription>
                Use 8 caracteres, maiúscula, minúscula e número.
              </FieldDescription>
              <FieldError>{state.fieldErrors?.password?.[0]}</FieldError>
            </Field>
            <Field
              data-invalid={Boolean(state.fieldErrors?.passwordConfirmation)}
            >
              <FieldLabel htmlFor="registration-password-confirmation">
                Confirmar senha
              </FieldLabel>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.passwordConfirmation)}
                autoComplete="new-password"
                className="h-12 rounded-xl"
                id="registration-password-confirmation"
                name="passwordConfirmation"
                required
                type="password"
              />
              <FieldError>
                {state.fieldErrors?.passwordConfirmation?.[0]}
              </FieldError>
            </Field>
          </FieldGroup>
        </FieldSet>

        {role ? (
          <ProfileFormFields
            fieldErrors={state.fieldErrors}
            key={role}
            role={role}
          />
        ) : (
          <Alert>
            <AlertTitle>Escolha seu tipo de cadastro</AlertTitle>
            <AlertDescription>
              Ao selecionar creator ou empresa, os campos específicos aparecem
              aqui.
            </AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full"
          disabled={pending || !role}
          size="lg"
          type="submit"
        >
          {pending ? <Spinner aria-label="Criando cadastro" /> : null}
          {pending ? "Criando cadastro..." : "Criar conta e enviar perfil"}
        </Button>
      </form>

      <FieldSeparator>ou entre com</FieldSeparator>

      <form action={googleAction}>
        <Button className="w-full" size="lg" type="submit" variant="outline">
          Continuar com o Google
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Já tem uma conta?{" "}
        <Link
          className="text-brand-blue font-semibold hover:underline"
          href="/login"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
