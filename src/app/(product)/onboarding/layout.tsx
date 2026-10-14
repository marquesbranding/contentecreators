import { BackofficeAccessProvider } from "@/features/identity";
import {
  getServerCurrentAccount,
  signOutAction,
} from "@/features/identity/server";
import { LegalAcceptanceModal } from "@/features/legal-acceptance";
import { loadPendingLegalDocuments } from "@/features/legal-acceptance/server";

/**
 * An administrator reaches onboarding when their identity has no product
 * profile yet. Exposing backoffice access here lets them administer the
 * platform without being forced to create one; every other session sees the
 * onboarding exactly as before.
 */
export default async function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [adminAccount, pendingLegalDocuments] = await Promise.all([
    getServerCurrentAccount("ADMIN"),
    loadPendingLegalDocuments(),
  ]);

  return (
    <BackofficeAccessProvider hasBackofficeAccess={Boolean(adminAccount)}>
      {children}
      <LegalAcceptanceModal
        initialPending={pendingLegalDocuments}
        signOut={signOutAction}
      />
    </BackofficeAccessProvider>
  );
}
