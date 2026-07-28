export const COMPANY_CAROUSEL_DEFAULT_LIMIT = 12;
export const COMPANY_CAROUSEL_MAX_LIMIT = 24;

export interface CompanyCarouselLogoReferenceDto {
  alt: string;
  assetId: string;
}

export interface CompanyCarouselItemDto {
  displayName: string;
  logo: CompanyCarouselLogoReferenceDto;
  websiteUrl: string | null;
}

export interface CompanyCarouselResponseDto {
  items: CompanyCarouselItemDto[];
  limit: number;
}

export interface CompanyCarouselRequest {
  limit?: number;
}
