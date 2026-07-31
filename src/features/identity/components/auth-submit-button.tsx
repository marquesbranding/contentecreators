"use client";

import { ActionSubmitButton } from "@/shared/components/action-submit-button";

interface AuthSubmitButtonProps {
  children: React.ReactNode;
  pending: boolean;
  pendingLabel: string;
}

export function AuthSubmitButton({
  children,
  pending,
  pendingLabel,
}: AuthSubmitButtonProps) {
  return (
    <ActionSubmitButton
      className="w-full"
      pending={pending}
      pendingLabel={pendingLabel}
      size="lg"
    >
      {children}
    </ActionSubmitButton>
  );
}
