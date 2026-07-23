"use client";

import { LogIn } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";

export function GoogleAuthButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      disabled={pending}
      size="lg"
      type="submit"
      variant="outline"
    >
      {pending ? (
        <Spinner aria-label="Conectando com o Google" />
      ) : (
        <LogIn aria-hidden="true" />
      )}
      {pending ? "Conectando..." : "Continuar com o Google"}
    </Button>
  );
}
