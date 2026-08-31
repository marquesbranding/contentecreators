import { redirect } from "next/navigation";

import { BackofficeShell } from "@/features/backoffice";
import { getAccountDestination } from "@/features/identity";
import {
  createServerBackofficeAuthService,
  getServerCurrentAccount,
  signOutAction,
} from "@/features/identity/server";

export default async function ProtectedBackofficeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const service = await createServerBackofficeAuthService();
  const access = await service.authorize(crypto.randomUUID());

  if (access.kind === "denied") {
    redirect("/backoffice/login?error=unauthorized");
  }

  const linkedAccount = await getServerCurrentAccount("NON_ADMIN");
  const appSwitcher = {
    href: linkedAccount
      ? getAccountDestination(linkedAccount)
      : "/onboarding/role",
    label: "Acessar o app",
  };

  return (
    <BackofficeShell appSwitcher={appSwitcher} signOutAction={signOutAction}>
      {children}
    </BackofficeShell>
  );
}
