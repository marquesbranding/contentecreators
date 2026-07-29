import type { Metadata } from "next";

import { ApplicationProvider } from "@/app/_providers/application-provider";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function BackofficeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ApplicationProvider>{children}</ApplicationProvider>;
}
