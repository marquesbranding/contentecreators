import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SkipLink } from "@/shared/components/skip-link";

import "./globals.css";

const geistSans = Geist({
  display: "optional",
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  display: "optional",
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  applicationName: "Contente Creators",
  title: {
    default: "Contente Creators",
    template: "%s | Contente Creators",
  },
  description:
    "A plataforma que aproxima creators e empresas por meio de perfis selecionados e conexões relevantes.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/brand/official/contente-creators-blue.png",
    shortcut: "/brand/official/contente-creators-blue.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Contente Creators",
    title: "Contente Creators — creators e marcas no mesmo ritmo",
    description:
      "Crie seu perfil, passe por uma curadoria humana e encontre conexões relevantes.",
    url: "/",
    images: [
      {
        alt: "Contente Creators",
        height: 3_334,
        url: "/brand/official/contente-creators-blue.png",
        width: 3_334,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contente Creators — creators e marcas no mesmo ritmo",
    description:
      "Crie seu perfil, passe por uma curadoria humana e encontre conexões relevantes.",
    images: ["/brand/official/contente-creators-blue.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
