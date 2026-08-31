import { BackofficeAccessProvider } from "@/features/identity";
import { getServerCurrentAccount } from "@/features/identity/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminAccount = await getServerCurrentAccount("ADMIN");

  return (
    <BackofficeAccessProvider hasBackofficeAccess={Boolean(adminAccount)}>
      {children}
    </BackofficeAccessProvider>
  );
}
