"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { ActionSubmitButton } from "@/shared/components/action-submit-button";

type ActionSubmitButtonProps = ComponentProps<typeof ActionSubmitButton>;

export function FormStatusSubmitButton({
  pendingLabel,
  ...props
}: Omit<ActionSubmitButtonProps, "pending">) {
  const { pending } = useFormStatus();

  return (
    <ActionSubmitButton
      pending={pending}
      pendingLabel={pendingLabel}
      {...props}
    />
  );
}
