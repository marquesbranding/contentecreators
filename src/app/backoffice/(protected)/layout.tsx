import { redirect } from "next/navigation";

import { BackofficeShell } from "@/features/backoffice";
import { createServerBackofficeAuthService } from "@/features/identity/server";
import { signOutAction } from "@/features/identity/server";

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

  return (
    <BackofficeShell signOutAction={signOutAction}>{children}</BackofficeShell>
  );
}
