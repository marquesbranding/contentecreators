import {
  ApprovedCatalogEntry,
  DirectoryLoadingSkeleton,
} from "@/features/catalog";
import { signOutAction } from "@/features/identity/server";

export default function CatalogLoading() {
  return (
    <ApprovedCatalogEntry signOutAction={signOutAction}>
      <DirectoryLoadingSkeleton />
    </ApprovedCatalogEntry>
  );
}
