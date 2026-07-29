"use client";

import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

import { useCatalogDetail } from "../hooks/use-catalog-detail";
import type { CatalogCreatorDetailViewDto } from "../types/catalog-detail-view.types";
import { CatalogDetailView } from "./catalog-detail-view";

export function CatalogDetailScreen({
  creatorId,
  initialData,
  revalidate = true,
}: {
  creatorId: string;
  initialData: CatalogCreatorDetailViewDto | null;
  revalidate?: boolean;
}) {
  return (
    <BrowserQueryProvider>
      <CatalogDetailScreenContent
        creatorId={creatorId}
        initialData={initialData}
        revalidate={revalidate}
      />
    </BrowserQueryProvider>
  );
}

function CatalogDetailScreenContent({
  creatorId,
  initialData,
  revalidate,
}: {
  creatorId: string;
  initialData: CatalogCreatorDetailViewDto | null;
  revalidate: boolean;
}) {
  const query = useCatalogDetail(creatorId, initialData, revalidate);

  if (query.isPending) {
    return <CatalogDetailView detail={null} status="loading" />;
  }

  if (query.isError) {
    return (
      <CatalogDetailView
        detail={null}
        onRetry={() => void query.refetch()}
        status="error"
      />
    );
  }

  return <CatalogDetailView detail={query.data} status="success" />;
}
