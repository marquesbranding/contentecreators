import type { Metadata } from "next";

import { LegalPlaceholderPage } from "@/features/marketing";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de Privacidade da plataforma Contente Creators.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function PrivacyPage() {
  return <LegalPlaceholderPage documentType="privacy" />;
}
