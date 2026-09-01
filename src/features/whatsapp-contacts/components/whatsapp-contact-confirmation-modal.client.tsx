"use client";

import { useState, useTransition } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Spinner } from "@/shared/components/ui/spinner";

import { confirmWhatsappContactAction } from "../server/actions/whatsapp-contact.actions";
import type { PendingWhatsappContactDto } from "../types/whatsapp-contact.types";

/**
 * Asks, one at a time, about every WhatsApp contact the company hasn't
 * confirmed yet. Dismissing (either button, Esc, or the overlay) just drops
 * that question from this session's queue — the confirmation stays pending
 * server-side and comes back on the next fresh visit.
 */
export function WhatsappContactConfirmationModal({
  initialPending,
}: {
  initialPending: PendingWhatsappContactDto[];
}) {
  const [queue, setQueue] = useState(initialPending);
  const [isConfirming, startConfirm] = useTransition();
  const current = queue[0];

  if (!current) {
    return null;
  }

  function dismissCurrent() {
    setQueue((remaining) => remaining.slice(1));
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          dismissCurrent();
        }
      }}
      open
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Você chamou {current.creatorDisplayName} no WhatsApp?
          </DialogTitle>
          <DialogDescription>
            Isso ajuda a mostrar, no perfil dele, quantas empresas já entraram
            em contato.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={isConfirming}
            onClick={dismissCurrent}
            type="button"
            variant="outline"
          >
            Ainda não
          </Button>
          <Button
            disabled={isConfirming}
            onClick={() => {
              startConfirm(async () => {
                try {
                  await confirmWhatsappContactAction(current.confirmationId);
                } finally {
                  dismissCurrent();
                }
              });
            }}
            type="button"
          >
            {isConfirming ? <Spinner aria-label="Confirmando" /> : null}
            Sim, chamei
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
