"use client";

import { Download, ExternalLink, LogOut } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Spinner } from "@/shared/components/ui/spinner";

import { acceptLegalDocumentsAction } from "../server/actions/legal-acceptance.actions";
import type { PendingLegalDocumentDto } from "../types/legal-acceptance.types";

const STALE_MESSAGE = "Os documentos foram atualizados. Recarregamos a página.";
const ERROR_MESSAGE = "Não foi possível salvar seu aceite. Tente novamente.";

/**
 * Blocking acceptance of the latest TERMS and PRIVACY versions. It cannot be
 * dismissed: the only exits are accepting or signing out. Closing it on
 * success is driven by the refreshed server list (the next render no longer
 * receives the accepted documents), with a local flag as the fallback.
 */
export function LegalAcceptanceModal({
  initialPending,
  signOut,
}: {
  initialPending: PendingLegalDocumentDto[];
  signOut: () => Promise<void>;
}) {
  const router = useRouter();
  const [isAccepting, startAccept] = useTransition();
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  if (accepted || initialPending.length === 0) {
    return null;
  }

  const titles = initialPending.map((document) => document.title).join(", ");

  function accept() {
    if (inFlight.current) {
      return;
    }

    inFlight.current = true;
    setErrorMessage(null);
    startAccept(async () => {
      try {
        const result = await acceptLegalDocumentsAction({
          documentIds: initialPending.map((document) => document.id),
        });

        if (result.kind === "accepted") {
          setAccepted(true);
          router.refresh();
          return;
        }

        if (result.kind === "stale") {
          setErrorMessage(STALE_MESSAGE);
          router.refresh();
          return;
        }

        setErrorMessage(ERROR_MESSAGE);
      } catch {
        setErrorMessage(ERROR_MESSAGE);
      } finally {
        inFlight.current = false;
      }
    });
  }

  return (
    <Dialog open>
      <DialogContent
        className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="gap-2 pr-2">
          <DialogTitle className="text-lg">
            Aceite os documentos para continuar
          </DialogTitle>
          <DialogDescription>
            Atualizamos nossos documentos legais. Leia, baixe se quiser e
            confirme o aceite de: {titles}.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {initialPending.map((document) => (
            <li className="space-y-2 rounded-xl border p-4" key={document.id}>
              <p className="font-semibold">{document.title}</p>
              <p className="text-muted-foreground text-sm">
                Versão {document.versionLabel} · publicado em{" "}
                {document.publishedLabel}
              </p>
              {document.pdfUrl ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    aria-label={`Abrir ${document.title} em nova aba`}
                    className={buttonVariants({
                      size: "sm",
                      variant: "outline",
                    })}
                    href={document.pdfUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" />
                    Abrir PDF
                  </a>
                  <a
                    aria-label={`Baixar PDF de ${document.title}`}
                    className={buttonVariants({
                      size: "sm",
                      variant: "outline",
                    })}
                    download={document.downloadName ?? undefined}
                    href={document.pdfUrl}
                  >
                    <Download aria-hidden="true" />
                    Baixar PDF
                  </a>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  PDF indisponível no momento.
                </p>
              )}
            </li>
          ))}
        </ul>

        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium">
          <Checkbox
            checked={checked}
            disabled={isAccepting}
            onCheckedChange={(value) => setChecked(value === true)}
          />
          <span>Li e aceito os documentos acima</span>
        </label>

        {errorMessage ? (
          <p className="text-destructive text-sm" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <DialogFooter className="-mx-6 -mb-6 flex-col gap-2 p-6 sm:flex-row sm:justify-between">
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              <LogOut aria-hidden="true" />
              Sair
            </Button>
          </form>
          <Button
            disabled={!checked || isAccepting}
            onClick={accept}
            type="button"
          >
            {isAccepting ? <Spinner aria-label="Salvando aceite" /> : null}
            Aceitar e continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
