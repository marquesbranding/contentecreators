import type { Metadata } from "next";

import { LegalDocumentPage, currentPrivacyDocument } from "@/features/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade e Proteção de Dados da plataforma Contente Creators, versão 1.0.",
  robots: {
    follow: true,
    index: true,
  },
};

export default function PrivacyPage() {
  return <LegalDocumentPage document={currentPrivacyDocument} />;
}
