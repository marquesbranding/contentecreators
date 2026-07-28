"use client";

import { COMPANY_CAROUSEL_DEFAULT_LIMIT } from "../types/company-carousel.types";
import { useCompanyCarousel } from "../hooks/use-company-carousel";
import type { CompanyCarouselViewResponseDto } from "../types/company-carousel-view.types";
import { CompanyCarouselView } from "./company-carousel";

export function CompanyCarouselScreen({
  initialData,
  limit = COMPANY_CAROUSEL_DEFAULT_LIMIT,
}: {
  initialData?: CompanyCarouselViewResponseDto;
  limit?: number;
}) {
  const query = useCompanyCarousel(limit, initialData);

  if (query.isPending) {
    return <CompanyCarouselView response={null} status="loading" />;
  }

  if (query.isError) {
    return (
      <CompanyCarouselView
        onRetry={() => void query.refetch()}
        response={null}
        status="error"
      />
    );
  }

  return <CompanyCarouselView response={query.data} status="success" />;
}
