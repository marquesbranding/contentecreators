"use client";

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
