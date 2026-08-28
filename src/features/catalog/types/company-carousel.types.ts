export const COMPANY_CAROUSEL_DEFAULT_LIMIT = 12;
export const COMPANY_CAROUSEL_MAX_LIMIT = 24;

export interface CompanyCarouselLogoReferenceDto {
  alt: string;
  assetId: string;
}

export interface CompanyCarouselItemDto {
  city: string | null;
  companyId: string;
  description: string | null;
  displayName: string;
  email: string;
  logo: CompanyCarouselLogoReferenceDto | null;
  segment: string | null;
  state: string | null;
  websiteUrl: string | null;
  whatsappE164: string | null;
}

export interface CompanyCarouselResponseDto {
  items: CompanyCarouselItemDto[];
  limit: number;
}

export interface CompanyCarouselRequest {
  limit?: number;
  search?: string;
  segment?: string;
}
