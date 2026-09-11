import { BackofficeAccessProvider } from "@/features/identity";
import { getServerCurrentAccount } from "@/features/identity/server";

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
  const adminAccount = await getServerCurrentAccount("ADMIN");

  return (
    <BackofficeAccessProvider hasBackofficeAccess={Boolean(adminAccount)}>
      {children}
    </BackofficeAccessProvider>
  );
}
