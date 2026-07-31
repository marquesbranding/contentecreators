"use client";

import { LogOut } from "lucide-react";

import { FormStatusSubmitButton } from "@/shared/components/form-status-submit-button";
import { getBrowserQueryClient } from "@/shared/query/browser-query-client";

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={() => {
        getBrowserQueryClient().clear();
      }}
    >
      <FormStatusSubmitButton
        aria-label="Sair da conta"
        compactPending
        idleIcon={<LogOut aria-hidden="true" />}
        pendingLabel="Saindo da conta..."
        size="icon"
        variant="ghost"
      />
    </form>
  );
}
