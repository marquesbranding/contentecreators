import type { ReactNode } from "react";

import { AuthenticatedProductShell } from "@/features/identity";

export function ApprovedCatalogEntry({
  children,
  signOutAction,
  viewerRole,
}: {
  children?: ReactNode;
  signOutAction: () => Promise<void>;
  viewerRole?: "COMPANY" | "INFLUENCER";
}) {
  return (
    <AuthenticatedProductShell
      signOutAction={signOutAction}
      viewerRole={viewerRole}
    >
      <main
        className="px-4 py-4 sm:px-8 sm:py-6"
        id="main-content"
        tabIndex={-1}
      >
        <div className="mx-auto max-w-7xl">
          <h1 className="sr-only">Catálogo de creators</h1>
          {children ?? null}
        </div>
      </main>
    </AuthenticatedProductShell>
  );
}
