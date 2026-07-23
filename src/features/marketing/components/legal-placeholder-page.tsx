import { ArrowLeft, FileWarning } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/shared/components/brand-logo";
import { ptBR } from "@/shared/copy/pt-BR";

type LegalPlaceholderPageProps = {
  documentType: "privacy" | "terms";
};

export function LegalPlaceholderPage({
  documentType,
}: LegalPlaceholderPageProps) {
  const copy = ptBR.legal[documentType];

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-black">
      <header className="border-b border-white/15 bg-black">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link
            aria-label="Contente Creators — início"
            className="rounded-md focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none"
            href="/"
          >
            <BrandLogo />
          </Link>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-white focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-extrabold tracking-[0.12em] text-[#0059db] uppercase">
          Documento legal
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
          {copy.title}
        </h1>
        <div
          className="mt-8 flex items-start gap-4 border-2 border-[#b86800] bg-[#fff5df] p-5"
          role="note"
        >
          <FileWarning
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-[#8c4e00]"
          />
          <div>
            <h2 className="font-extrabold">
              Conteúdo preliminar — lançamento bloqueado
            </h2>
            <p className="mt-2 leading-7 text-[#5f4a27]">
              {ptBR.legal.launchBlocker}
            </p>
          </div>
        </div>
        <section className="mt-10 border-y-2 border-black py-8">
          <h2 className="text-2xl font-extrabold tracking-[-0.025em]">
            O que falta aprovar
          </h2>
          <ul className="mt-5 list-disc space-y-3 pl-6 leading-7 text-[#555]">
            {copy.pendingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <p className="mt-8 text-sm leading-6 text-[#686868]">
          Nenhum consentimento será coletado com base neste texto preliminar.
        </p>
      </main>
    </div>
  );
}
