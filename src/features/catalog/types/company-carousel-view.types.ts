import type { CatalogSignedMediaDto } from "./catalog-detail-view.types";

export interface CompanyCarouselViewItemDto {
  displayName: string;
  logo: CatalogSignedMediaDto;
  websiteUrl: string | null;
}

export interface CompanyCarouselViewResponseDto {
  items: CompanyCarouselViewItemDto[];
  limit: number;
}
