import { CatalogDetailLoading } from "@/features/catalog";
import { AuthenticatedProductShell } from "@/features/identity";
import { signOutAction } from "@/features/identity/server";

export default function CompanyDetailLoading() {
  return (
    <AuthenticatedProductShell signOutAction={signOutAction}>
      <CatalogDetailLoading />
    </AuthenticatedProductShell>
  );
}
