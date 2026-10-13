import { Download, ExternalLink } from "lucide-react";

import type { LegalPdfDocument } from "@/features/legal/types/legal-document.types";
import { LegalPageHeader } from "@/shared/components/legal-page-header";

type LegalDocumentPageProps = {
  document: LegalPdfDocument;
};

const actionClassName =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-black px-4 font-semibold focus-visible:ring-3 focus-visible:ring-[#0059db]/50 focus-visible:outline-none";

export function LegalDocumentPage({ document }: LegalDocumentPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f6f2] text-black">
      <LegalPageHeader />
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
