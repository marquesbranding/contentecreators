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
  name: string;
}

export function PasswordField({
  autoComplete,
  description,
  error,
  id,
  label,
  name,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error?.length ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");

  return (
    <Field data-invalid={Boolean(error?.length)}>
      <FieldLabel htmlFor={id} required>
        {label}
      </FieldLabel>
      <InputGroup className="h-12 rounded-xl">
        <InputGroupInput
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error?.length)}
          autoComplete={autoComplete}
          id={id}
          name={name}
          required
          type={visible ? "text" : "password"}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setVisible((current) => !current)}
            size="icon-sm"
          >
            {visible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
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
