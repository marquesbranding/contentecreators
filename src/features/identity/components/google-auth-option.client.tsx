"use client";

import { KeyRound } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";

function GoogleProviderButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="group/google border-foreground/15 hover:border-brand-blue/40 hover:bg-brand-blue-soft/55 relative h-14 w-full overflow-hidden bg-white px-14 shadow-[0_1px_0_rgba(8,8,8,0.04)]"
      disabled={pending}
      type="submit"
      variant="outline"
    >
      <span
        className="bg-brand-blue-soft text-brand-blue group-hover/google:bg-brand-blue absolute left-3 flex size-8 items-center justify-center rounded-lg transition-colors group-hover/google:text-white"
        data-slot="google-auth-icon"
      >
        {pending ? (
          <Spinner aria-label="Conectando com o Google" className="size-4" />
        ) : (
          <KeyRound aria-hidden="true" className="size-4" />
        )}
      </span>
      <span>{pending ? "Conectando..." : "Continuar com o Google"}</span>
    </Button>
  );
}

export function GoogleAuthOption({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-label="Acesso com conta Google"
      className="space-y-4 pt-1"
      data-slot="google-auth-option"
    >
      <div
        aria-label="Outras formas de acesso"
        className="flex items-center gap-3"
        role="separator"
      >
        <span aria-hidden="true" className="bg-border h-px flex-1" />
        <span className="text-muted-foreground shrink-0 text-xs font-semibold tracking-[0.08em] uppercase">
          ou continue com
        </span>
        <span aria-hidden="true" className="bg-border h-px flex-1" />
      </div>

      <form action={action}>
        {children}
        <GoogleProviderButton />
      </form>
    </section>
  );
}
