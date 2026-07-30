import type { Metadata } from "next";

import {
  CatalogDetailScreen,
  catalogDetailQuerySchema,
} from "@/features/catalog";
import { AuthenticatedProductShell } from "@/features/identity";
import { signOutAction } from "@/features/identity/server";
import { AccountStatusBoundary } from "@/features/moderation/server";

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
      renderApproved={async () => {
        const query = catalogDetailQuerySchema.safeParse({
          creatorId,
          requestId: crypto.randomUUID(),
        });

        if (!query.success) {
          return (
            <AuthenticatedProductShell signOutAction={signOutAction}>
              <CatalogDetailScreen
                creatorId={creatorId}
                initialData={null}
                revalidate={false}
              />
            </AuthenticatedProductShell>
          );
        }

        const initialData = await loadServerCatalogDetail(query.data);

        return (
          <AuthenticatedProductShell signOutAction={signOutAction}>
            <CatalogDetailScreen
              creatorId={creatorId}
              initialData={initialData}
            />
          </AuthenticatedProductShell>
        );
      }}
    />
  );
}
