import { ApprovedCatalogEntry, CatalogLoadingSkeleton } from "@/features/catalog";
import { signOutAction } from "@/features/identity/server";

export default function CatalogLoading() {
  return (
    <ApprovedCatalogEntry signOutAction={signOutAction}>
      <CatalogLoadingSkeleton />
    </ApprovedCatalogEntry>
  );
}
