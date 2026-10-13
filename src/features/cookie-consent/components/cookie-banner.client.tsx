"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";

import { useCookieConsent } from "./use-cookie-consent";

const choiceButtonClassName = "min-w-32 flex-1 sm:flex-none";

function PreferencesControls({
  adsId,
  currentAds,
  onCancel,
  onSave,
}: {
  adsId: string;
  currentAds: boolean;
  onCancel: () => void;
  onSave: (ads: boolean) => void;
}) {
  // Mounted only while the panel is open, so it starts from the stored choice.
  const [draftAds, setDraftAds] = useState(currentAds);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-start gap-3 text-sm">
        <input
          checked
          className="mt-1 size-4"
          disabled
          readOnly
          type="checkbox"
        />
        <span>
          <span className="font-semibold">Essenciais</span> — sempre ativos,
          necessários para o login e a segurança.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm" htmlFor={adsId}>
        <input
          checked={draftAds}
          className="mt-1 size-4"
          id={adsId}
          onChange={(event) => setDraftAds(event.target.checked)}
          type="checkbox"
        />
        <span>
          <span className="font-semibold">Publicidade e medição</span> — Google
          Ads e Meta Pixel.
        </span>
      </label>
      <div className="flex flex-wrap gap-3">
        <Button
          className={choiceButtonClassName}
          onClick={() => onSave(draftAds)}
          type="button"
        >
          Salvar preferências
        </Button>
        <Button
          className={choiceButtonClassName}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function CookieBanner() {
  const {
    acceptAds,
    closePreferences,
    consent,
    preferencesOpen,
    rejectAds,
    savePreferences,
  } = useCookieConsent();
  const titleId = useId();
  const adsId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const visible =
    consent.status === "undecided" ||
    (consent.status === "decided" && preferencesOpen);
  const inPreferences = preferencesOpen;
  const currentAds = consent.status === "decided" && consent.ads;

  useEffect(() => {
    if (preferencesOpen) {
      headingRef.current?.focus();
    }
  }, [preferencesOpen]);

  useEffect(() => {
    if (!preferencesOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePreferences();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePreferences, preferencesOpen]);

  if (!visible) {
    return null;
  }

  return (
    <section
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-black bg-white p-4 text-black shadow-[0_-8px_24px_rgba(0,0,0,0.12)] sm:p-5"
      role="dialog"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div>
          <h2
            className="text-base font-extrabold outline-none"
            id={titleId}
            ref={headingRef}
            tabIndex={-1}
          >
            {inPreferences ? "Preferências de cookies" : "Cookies"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#333]">
            Usamos cookies essenciais para o site e o login funcionarem. Com a
            sua permissão, também usamos cookies de publicidade e medição do
            Google e da Meta para medir nossas campanhas e exibir anúncios da
            Contente. Recusar não impede o uso da plataforma.{" "}
            <Link
              className="text-brand-blue font-semibold underline"
              href="/cookies"
            >
              Aviso de cookies
            </Link>{" "}
            e{" "}
            <Link
              className="text-brand-blue font-semibold underline"
              href="/privacy"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </div>

        {inPreferences ? (
          <PreferencesControls
            adsId={adsId}
            currentAds={currentAds}
            onCancel={closePreferences}
            onSave={savePreferences}
          />
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button
              className={choiceButtonClassName}
              onClick={acceptAds}
              type="button"
            >
              Aceitar
            </Button>
            <Button
              className={choiceButtonClassName}
              onClick={rejectAds}
              type="button"
            >
              Recusar
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
