"use client";

import { Building2, CircleAlert, UserRound } from "lucide-react";
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
  FieldLabel,
} from "@/shared/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/lib/cn";

import type { RegistrationIntent } from "../types/auth.types";
import type { RoleSelectionAction } from "../types/role-selection.types";
import { initialRoleSelectionActionState } from "../types/role-selection.types";

const roleOptions = [
  {
    description:
      "Quero apresentar meu trabalho, informar meus canais e ser encontrado por empresas.",
    icon: UserRound,
    label: "Sou creator",
    value: "INFLUENCER",
  },
  {
    description:
      "Quero encontrar creators aprovados e conhecer perfis alinhados à minha marca.",
    icon: Building2,
    label: "Represento uma empresa",
    value: "COMPANY",
  },
] as const;

interface RoleSelectionFormProps {
  action: RoleSelectionAction;
  initialIntent?: RegistrationIntent;
}

export function RoleSelectionForm({
  action,
  initialIntent,
}: RoleSelectionFormProps) {
  const [selectedRole, setSelectedRole] = useState<RegistrationIntent | null>(
    initialIntent ?? null,
  );
  const [state, formAction, pending] = useActionState(
    action,
    initialRoleSelectionActionState,
  );
  const errorId = state.roleError ? "role-selection-error" : undefined;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.message ? (
        <Alert aria-live="polite" variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Não foi possível continuar</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={Boolean(state.roleError)}>
        <FieldLabel className="sr-only">Tipo de perfil</FieldLabel>
        <RadioGroup
          aria-describedby={errorId}
          aria-invalid={Boolean(state.roleError)}
          className="grid gap-4 md:grid-cols-2"
          name="role"
          onValueChange={(value) => {
            if (value === "INFLUENCER" || value === "COMPANY") {
              setSelectedRole(value);
            }
          }}
          value={selectedRole}
        >
          {roleOptions.map((option) => {
            const Icon = option.icon;
            const selected = selectedRole === option.value;

            return (
              <label
                className={cn(
                  "bg-card focus-within:ring-ring/40 relative flex min-h-52 cursor-pointer flex-col rounded-2xl border-2 p-5 transition-colors focus-within:ring-3 sm:p-6",
                  selected
                    ? "border-brand-blue bg-brand-blue-soft"
                    : "border-border hover:border-brand-blue/45",
                )}
                htmlFor={`role-${option.value.toLowerCase()}`}
                key={option.value}
                onClick={() => setSelectedRole(option.value)}
              >
                <span className="flex items-start justify-between gap-4">
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl",
                      selected
                        ? "bg-brand-blue text-white"
                        : "bg-muted text-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <RadioGroupItem
                    aria-describedby={`role-${option.value.toLowerCase()}-description`}
                    aria-labelledby={`role-${option.value.toLowerCase()}-title`}
                    id={`role-${option.value.toLowerCase()}`}
                    value={option.value}
                  />
                </span>
                <strong
                  className="mt-6 text-lg font-extrabold"
                  id={`role-${option.value.toLowerCase()}-title`}
                >
                  {option.label}
                </strong>
                <span
                  className="text-muted-foreground mt-2 text-sm leading-6"
                  id={`role-${option.value.toLowerCase()}-description`}
                >
                  {option.description}
                </span>
              </label>
            );
          })}
        </RadioGroup>
        <FieldError id={errorId}>{state.roleError}</FieldError>
        <FieldDescription className="rounded-xl border border-[#b86800]/25 bg-[#fff5df] px-4 py-3 text-[#69430b]">
          Essa escolha define seu cadastro e não poderá ser alterada por você
          depois da confirmação.
        </FieldDescription>
      </Field>

      <Button
        className="w-full"
        disabled={pending || !selectedRole}
        size="lg"
        type="submit"
      >
        {pending ? <Spinner aria-label="Confirmando perfil" /> : null}
        {pending ? "Confirmando..." : "Confirmar tipo de perfil"}
      </Button>
    </form>
  );
}
