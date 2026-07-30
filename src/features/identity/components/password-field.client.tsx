"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/shared/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/shared/components/ui/input-group";

interface PasswordFieldProps {
  autoComplete: "current-password" | "new-password";
  description?: string;
  error?: string[];
  id: string;
  label: string;
  matchFieldName?: string;
  matchMessage?: string;
  name: string;
}

export function PasswordField({
  autoComplete,
  description,
  error,
  id,
  label,
  matchFieldName,
  matchMessage,
  name,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const enforcesPasswordStrength =
    autoComplete === "new-password" && !matchFieldName;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error?.length ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");

  return (
    <Field data-invalid={Boolean(error?.length)}>
      <FieldLabel htmlFor={id} required>
        {label}
      </FieldLabel>
      <InputGroup className="h-12 overflow-visible rounded-xl">
        <InputGroupInput
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error?.length)}
          autoComplete={autoComplete}
          className="min-w-0 pr-14!"
          data-match-field={matchFieldName}
          data-match-message={matchMessage}
          data-validation-message={
            enforcesPasswordStrength
              ? "Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e um número."
              : undefined
          }
          id={id}
          minLength={enforcesPasswordStrength ? 8 : undefined}
          name={name}
          pattern={
            enforcesPasswordStrength
              ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}"
              : undefined
          }
          required
          type={visible ? "text" : "password"}
        />
        <InputGroupAddon
          align="inline-end"
          className="absolute inset-y-0 right-1 z-10 shrink-0 p-0"
        >
          <InputGroupButton
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            className="text-foreground min-h-11 min-w-11 shrink-0 touch-manipulation opacity-100"
            data-slot="password-visibility-toggle"
            onClick={() => setVisible((current) => !current)}
            size="icon-sm"
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      <FieldError id={errorId}>
        {error?.map((message) => (
          <span className="block" key={message}>
            {message}
          </span>
        ))}
      </FieldError>
    </Field>
  );
}
