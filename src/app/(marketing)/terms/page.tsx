import type { Metadata } from "next";

import { LegalPlaceholderPage } from "@/features/marketing";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso da plataforma Contente Creators.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function TermsPage() {
  return <LegalPlaceholderPage documentType="terms" />;
}
