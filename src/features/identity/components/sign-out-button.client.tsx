"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  const queryClient = useQueryClient();

  return (
    <form
      action={action}
      onSubmit={() => {
        queryClient.clear();
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
