import { BackofficeAccessProvider } from "@/features/identity";
import {
  getServerCurrentAccount,
  signOutAction,
} from "@/features/identity/server";
import { LegalAcceptanceModal } from "@/features/legal-acceptance";
import { loadPendingLegalDocuments } from "@/features/legal-acceptance/server";
import { WhatsappContactConfirmationModal } from "@/features/whatsapp-contacts";
import { loadPendingWhatsappContactConfirmations } from "@/features/whatsapp-contacts/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [adminAccount, pendingWhatsappContacts, pendingLegalDocuments] =
    await Promise.all([
      getServerCurrentAccount("ADMIN"),
      loadPendingWhatsappContactConfirmations(),
      loadPendingLegalDocuments(),
    ]);

  return (
    <BackofficeAccessProvider hasBackofficeAccess={Boolean(adminAccount)}>
      {children}
      <WhatsappContactConfirmationModal
        initialPending={pendingWhatsappContacts}
      />
      {/* Rendered last so the mandatory acceptance stays above other prompts. */}
      <LegalAcceptanceModal
        initialPending={pendingLegalDocuments}
        signOut={signOutAction}
      />
    </BackofficeAccessProvider>
  );
}
