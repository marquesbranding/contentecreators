import type { Metadata } from "next";

import { CookieNoticePage } from "@/features/cookie-consent";

export const metadata: Metadata = {
  title: "Aviso de cookies",
  description:
    "Lista de cookies e tecnologias usadas pela Contente Creators, com fornecedor, finalidade e prazo.",
  robots: {
    follow: true,
    index: true,
  },
};

export default function CookiesPage() {
  return <CookieNoticePage />;
}
