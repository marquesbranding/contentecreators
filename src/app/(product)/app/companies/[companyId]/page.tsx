import type { Metadata } from "next";

import {
  CompanyDetailView,
  companyDetailQuerySchema,
} from "@/features/catalog";
import { AuthenticatedProductShell } from "@/features/identity";
import { signOutAction } from "@/features/identity/server";
import { AccountStatusBoundary } from "@/features/moderation/server";

import { loadServerCompanyDetail } from "@/app/_server/company-detail.loader";

export const metadata: Metadata = {
  title: "Perfil da marca",
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return (
    <AccountStatusBoundary
      renderApproved={async (account) => {
        const viewerRole =
          account.role === "COMPANY" || account.role === "INFLUENCER"
            ? account.role
            : undefined;
        const query = companyDetailQuerySchema.safeParse({
          companyId,
          requestId: crypto.randomUUID(),
        });
        const initialData = query.success
          ? await loadServerCompanyDetail(query.data)
          : null;

        return (
          <AuthenticatedProductShell
            signOutAction={signOutAction}
            viewerRole={viewerRole}
          >
            <CompanyDetailView detail={initialData} />
          </AuthenticatedProductShell>
        );
      }}
    />
  );
}
