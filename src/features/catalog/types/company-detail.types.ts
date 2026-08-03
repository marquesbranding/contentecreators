import type { CatalogSignedMediaDto } from "./catalog-detail-view.types";

export interface CompanyMediaReferenceDto {
  assetId: string;
  kind: "COVER" | "LOGO";
}

export interface CompanyDetailDto {
  companyId: string;
  contact: {
    email: { href: string };
    site: { href: string } | null;
    whatsapp: { href: string } | null;
  };
  description: string | null;
  displayName: string;
  location: {
    city: string;
    state: string;
  } | null;
  media: {
    cover: CompanyMediaReferenceDto | null;
    logo: CompanyMediaReferenceDto | null;
  };
  segment: string | null;
}

export interface CompanyDetailViewDto extends Omit<CompanyDetailDto, "media"> {
  media: {
    cover: CatalogSignedMediaDto | null;
    logo: CatalogSignedMediaDto | null;
  };
}
