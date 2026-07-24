import type { Metadata } from "next";

import { ApprovedCatalogEntry } from "@/features/catalog";
import { signOutAction } from "@/features/identity/server";
import { AccountStatusBoundary } from "@/features/moderation/server";

export const metadata: Metadata = {
  title: "Catálogo",
};

export default function CatalogPage() {
  return (
    <AccountStatusBoundary
      renderApproved={() => (
        <ApprovedCatalogEntry showProfileLink signOutAction={signOutAction} />
      )}
    />
  );
}
