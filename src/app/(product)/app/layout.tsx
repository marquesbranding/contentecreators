import { BackofficeAccessProvider } from "@/features/identity";
import { getServerCurrentAccount } from "@/features/identity/server";
import { WhatsappContactConfirmationModal } from "@/features/whatsapp-contacts";
import { loadPendingWhatsappContactConfirmations } from "@/features/whatsapp-contacts/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [adminAccount, pendingWhatsappContacts] = await Promise.all([
    getServerCurrentAccount("ADMIN"),
    loadPendingWhatsappContactConfirmations(),
  ]);

  return (
    <BackofficeAccessProvider hasBackofficeAccess={Boolean(adminAccount)}>
      {children}
      <WhatsappContactConfirmationModal
        initialPending={pendingWhatsappContacts}
      />
    </BackofficeAccessProvider>
  );
}
