"use client";

import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

import { useCatalogDetail } from "../hooks/use-catalog-detail";
import type { CatalogCreatorDetailViewDto } from "../types/catalog-detail-view.types";
import { CatalogDetailView } from "./catalog-detail-view";

interface CatalogDetailScreenProps {
  creatorId: string;
  initialData: CatalogCreatorDetailViewDto | null;
  onWhatsappContactClick?: (creatorProfileId: string) => void;
  revalidate?: boolean;
}

export function CatalogDetailScreen({
  creatorId,
  initialData,
  onWhatsappContactClick,
  revalidate = true,
}: CatalogDetailScreenProps) {
  return (
    <BrowserQueryProvider>
      <CatalogDetailScreenContent
        creatorId={creatorId}
        initialData={initialData}
        onWhatsappContactClick={onWhatsappContactClick}
        revalidate={revalidate}
      />
    </BrowserQueryProvider>
  );
}

function CatalogDetailScreenContent({
  creatorId,
  initialData,
  onWhatsappContactClick,
  revalidate,
}: {
  creatorId: string;
  initialData: CatalogCreatorDetailViewDto | null;
  onWhatsappContactClick?: (creatorProfileId: string) => void;
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

  return (
    <CatalogDetailView
      detail={query.data}
      onWhatsappClick={() => {
        onWhatsappContactClick?.(creatorId);
      }}
      status="success"
    />
  );
}
