import { LockKeyhole } from "lucide-react";

import { BrandLogo } from "@/shared/components/brand-logo";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { SignOutButton } from "./sign-out-button.client";

export function RoleSelectionShell({
  children,
  signOutAction,
}: {
  children: React.ReactNode;
  signOutAction: () => Promise<void>;
}) {
  return (
    <main className="bg-brand-canvas relative min-h-screen overflow-hidden px-5 py-7 sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="bg-brand-blue/15 absolute -top-48 left-1/2 size-[32rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <div className="relative mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <span className="bg-brand-night rounded-md">
            <BrandLogo />
          </span>
          <div className="flex items-center gap-2">
            <Badge
              className="hidden gap-1.5 rounded-full px-3 py-1.5 sm:inline-flex"
              variant="outline"
            >
              <LockKeyhole aria-hidden="true" />
              Primeiro acesso
            </Badge>
            <SignOutButton action={signOutAction} />
          </div>
        </header>

        <div className="mx-auto mt-16 max-w-lg text-center sm:mt-24">
          <p className="text-muted-foreground text-sm leading-6">
            Estamos preparando seu primeiro acesso. Escolha o tipo de perfil
            para continuar.
          </p>
        </div>

        <Dialog open>
          <DialogContent
            className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 sm:max-w-3xl"
            showCloseButton={false}
          >
            <DialogHeader className="gap-3 border-b px-6 py-7 text-left sm:px-9">
              <p className="text-brand-blue text-xs font-extrabold tracking-[0.12em] uppercase">
                Primeiro acesso com Google
              </p>
              <DialogTitle className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                Como você vai usar a Contente Creators?
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-base leading-7">
                Escolha apenas uma opção. Em seguida, vamos solicitar os dados
                específicos do seu perfil.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-7 sm:px-9">{children}</div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
