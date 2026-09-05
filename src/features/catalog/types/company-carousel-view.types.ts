import type { CatalogSignedMediaDto } from "./catalog-detail-view.types";
import type { CompanyCarouselFacetsDto } from "./company-carousel.types";

export interface CompanyCarouselViewItemDto {
  city: string | null;
  companyId: string;
  description: string | null;
  displayName: string;
  email: string;
  logo: CatalogSignedMediaDto | null;
  segment: string | null;
  state: string | null;
  websiteUrl: string | null;
  whatsappE164: string | null;
}

export interface CompanyCarouselViewResponseDto {
  facets: CompanyCarouselFacetsDto;
  items: CompanyCarouselViewItemDto[];
  limit: number;
}
