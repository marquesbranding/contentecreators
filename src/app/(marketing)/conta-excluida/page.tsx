import type { Metadata } from "next";

import { AccountDeletedPage } from "@/features/account-deletion";

export const metadata: Metadata = {
  title: "Conta excluída",
  robots: { follow: false, index: false },
};

export default function ContaExcluidaPage() {
  return <AccountDeletedPage />;
}
