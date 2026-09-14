"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";

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
}: {
  email: string;
  onOpenChange: (open: boolean) => void;
  onUseAnotherEmail: () => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Você já tem cadastro</DialogTitle>
          <DialogDescription>
            O e-mail <strong className="text-foreground">{email}</strong> já
            está cadastrado na Contente Creators. Faça login — com sua senha ou
            com o Google — para acessar sua conta, acompanhar a análise e editar
            seu perfil.
          </DialogDescription>
        </DialogHeader>
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
