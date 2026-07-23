import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ApplicationProvider } from "@/app/_providers/application-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
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
    icon: "/brand/contente-creators-logo.png",
    shortcut: "/brand/contente-creators-logo.png",
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
        height: 1_141,
        url: "/brand/contente-creators-logo.png",
        width: 3_370,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contente Creators — creators e marcas no mesmo ritmo",
    description:
      "Crie seu perfil, passe por uma curadoria humana e encontre conexões relevantes.",
    images: ["/brand/contente-creators-logo.png"],
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
        <ApplicationProvider>{children}</ApplicationProvider>
      </body>
    </html>
  );
}
