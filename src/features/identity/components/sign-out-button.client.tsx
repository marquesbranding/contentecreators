"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { getBrowserQueryClient } from "@/shared/query/browser-query-client";

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={() => {
        getBrowserQueryClient().clear();
      }}
    >
      <Button
        aria-label="Sair da conta"
        size="icon"
        type="submit"
        variant="ghost"
      >
        <LogOut aria-hidden="true" />
      </Button>
    </form>
  );
}
