import { redirect } from "next/navigation";

import { createServerBackofficeAuthService } from "@/features/identity/server";

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

  return children;
}
