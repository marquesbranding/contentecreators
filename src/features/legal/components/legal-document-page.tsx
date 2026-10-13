import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import Link from "next/link";

import type { LegalPdfDocument } from "@/features/legal/types/legal-document.types";
import { BrandLogo } from "@/shared/components/brand-logo";

type LegalDocumentPageProps = {
  document: LegalPdfDocument;
};

const actionClassName =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-black px-4 font-semibold focus-visible:ring-3 focus-visible:ring-[#0059db]/50 focus-visible:outline-none";

export function LegalDocumentPage({ document }: LegalDocumentPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f6f2] text-black">
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
      <main
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10"
        id="main-content"
        tabIndex={-1}
      >
        <p className="text-sm font-extrabold tracking-[0.12em] text-[#0059db] uppercase">
          Documento legal
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
          {document.title}
        </h1>
        <p className="mt-2 font-semibold text-[#555]">
          Versão {document.versionLabel} · Atualizado em {document.updatedLabel}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            className={`${actionClassName} bg-black text-white`}
            download={document.downloadName}
            href={document.pdfUrl}
          >
            <Download aria-hidden="true" className="size-4" />
            Baixar PDF
          </a>
          <a
            className={`${actionClassName} bg-white`}
            href={document.pdfUrl}
            rel="noopener"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Abrir em nova aba
          </a>
        </div>
        <iframe
          className="mt-6 min-h-[70vh] w-full flex-1 border-2 border-black bg-white"
          src={`${document.pdfUrl}#view=FitH`}
          title={`${document.title} — versão ${document.versionLabel} (PDF)`}
        />
        <p className="mt-4 text-sm leading-6 text-[#555]">
          Se o documento não aparecer acima, use “Baixar PDF” ou “Abrir em nova
          aba”.
        </p>
      </main>
    </div>
  );
}
