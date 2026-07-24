"use client";

import { Send } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

export function OnboardingSubmitConfirmation({
  onConfirm,
  onOpenChange,
  open,
}: {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar cadastro para análise?</DialogTitle>
          <DialogDescription>
            Revise os dados antes de confirmar. Depois do envio, você só poderá
            editar o cadastro se nossa equipe solicitar correções.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Voltar e revisar
          </DialogClose>
          <Button onClick={onConfirm} type="button">
            <Send aria-hidden="true" />
            Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
