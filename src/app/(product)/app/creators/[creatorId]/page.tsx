import type { Metadata } from "next";

import {
  CatalogDetailScreen,
  catalogDetailQuerySchema,
} from "@/features/catalog";
import { AuthenticatedProductShell } from "@/features/identity";
import { signOutAction } from "@/features/identity/server";
import { AccountStatusBoundary } from "@/features/moderation/server";
import { recordWhatsappContactClickAction } from "@/features/whatsapp-contacts/server";

import { loadServerCatalogDetail } from "@/app/_server/catalog-detail.loader";

export const metadata: Metadata = {
  title: "Perfil do creator",
};

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = await params;

  return (
    <AccountStatusBoundary
      renderApproved={async (account) => {
        const viewerRole =
          account.role === "COMPANY" || account.role === "INFLUENCER"
            ? account.role
            : undefined;
        const query = catalogDetailQuerySchema.safeParse({
          creatorId,
          requestId: crypto.randomUUID(),
        });

        if (!query.success) {
          return (
            <AuthenticatedProductShell
              signOutAction={signOutAction}
              viewerRole={viewerRole}
            >
              <CatalogDetailScreen
                creatorId={creatorId}
                initialData={null}
                onWhatsappContactClick={recordWhatsappContactClickAction}
                revalidate={false}
              />
            </AuthenticatedProductShell>
          );
        }

        const initialData = await loadServerCatalogDetail(query.data);

        return (
          <AuthenticatedProductShell
            signOutAction={signOutAction}
            viewerRole={viewerRole}
          >
            <CatalogDetailScreen
              creatorId={creatorId}
              initialData={initialData}
              onWhatsappContactClick={recordWhatsappContactClickAction}
            />
          </AuthenticatedProductShell>
        );
      }}
    />
  );
}
