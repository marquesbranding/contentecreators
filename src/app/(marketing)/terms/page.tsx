import type { Metadata } from "next";

import { LegalDocumentPage, currentTermsDocument } from "@/features/legal";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso da plataforma Contente Creators, versão 1.0.",
  robots: {
    follow: true,
    index: true,
  },
};

export default function TermsPage() {
  return <LegalDocumentPage document={currentTermsDocument} />;
}
