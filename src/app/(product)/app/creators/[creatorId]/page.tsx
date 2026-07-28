import type { Metadata } from "next";

import {
  CatalogDetailScreen,
  catalogDetailQuerySchema,
} from "@/features/catalog";
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
            <CatalogDetailScreen
              creatorId={creatorId}
              initialData={null}
              revalidate={false}
            />
          );
        }

        const initialData = await loadServerCatalogDetail(query.data);

        return (
          <CatalogDetailScreen
            creatorId={creatorId}
            initialData={initialData}
          />
        );
      }}
    />
  );
}
