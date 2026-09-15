"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { GoogleAuthOption } from "@/features/identity/client";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

export function RegisteredEmailDialog({
  email,
  onOpenChange,
  onUseAnotherEmail,
  open,
  providers,
  googleAction,
}: {
  email: string;
  onOpenChange: (open: boolean) => void;
  onUseAnotherEmail: () => void;
  open: boolean;
  providers?: ("email" | "google")[];
  googleAction?: (data: FormData) => Promise<void>;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Você já possui um cadastro</DialogTitle>
          <DialogDescription>
            Encontramos uma conta com{" "}
            <strong className="text-foreground break-all">{email}</strong>.
            Acesse o login para entrar no sistema e continuar de onde parou.
          </DialogDescription>
        </DialogHeader>
        {providers?.includes("google") && googleAction ? (
          <GoogleAuthOption action={googleAction} />
        ) : null}
        <Link
          className="text-brand-blue text-sm font-semibold"
          href="/forgot-password"
        >
          Esqueci minha senha
        </Link>
        <DialogFooter>
          <Button onClick={onUseAnotherEmail} type="button" variant="outline">
            Usar outro e-mail
          </Button>
          <Link className={buttonVariants()} href="/login">
            <LogIn aria-hidden="true" />
            Ir para o login
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
