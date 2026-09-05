import type {
  CatalogCardMetricDto,
  CatalogCreatorType,
  CatalogNicheDto,
  CatalogSocialPlatform,
  CatalogViewer,
} from "./creator-catalog.types";

/** The three checkboxes the filter modal offers — companies are a kind on
 * their own, while influencer/UGC are both "creator" entries filtered by
 * `creatorType`. */
export type DirectoryTypeFilter = "COMPANY" | "INFLUENCER" | "UGC";

export interface DirectoryMetricRangeFilters {
  followersMax?: number;
  followersMin?: number;
  interactionsMax?: number;
  interactionsMin?: number;
  newFollowersMax?: number;
  newFollowersMin?: number;
  viewsMax?: number;
  viewsMin?: number;
}

export interface DirectoryFilters extends DirectoryMetricRangeFilters {
  city?: string;
  cursor?: string;
  niche?: string;
  pageSize: number;
  platform?: CatalogSocialPlatform;
  search?: string;
  segment?: string;
  state?: string;
  type?: DirectoryTypeFilter[];
}

export interface DirectoryCursor {
  createdAt: string;
  id: string;
  kind: "COMPANY" | "CREATOR";
}

export interface DirectoryQuery extends Omit<DirectoryFilters, "cursor"> {
  cursor: DirectoryCursor | null;
}

/**
 * Deliberately narrow catalog-list projection, same discipline as
 * `CreatorCatalogCardDto` — contact, account, moderation and audit data
 * never belong here. Contact is a detail-page concern.
 */
export interface DirectoryCompanyEntryDto {
  city: string | null;
  companyId: string;
  createdAt: string;
  description: string | null;
  displayName: string;
  kind: "COMPANY";
  logoAssetId?: string | null;
  segment: string | null;
  state: string | null;
  websiteUrl: string | null;
}

export interface DirectoryCreatorEntryDto {
  avatarAssetId?: string | null;
  bioExcerpt: string | null;
  city: string | null;
  coverAssetId?: string | null;
  createdAt: string;
  creatorId: string;
  creatorType: CatalogCreatorType;
  displayName: string;
  kind: "CREATOR";
  metrics: CatalogCardMetricDto[];
  niches: CatalogNicheDto[];
  socialPlatforms: CatalogSocialPlatform[];
  state: string | null;
  whatsappContactCount: number;
}

export type DirectoryEntryDto =
  DirectoryCompanyEntryDto | DirectoryCreatorEntryDto;

export interface DirectoryFacetsDto {
  cities: string[];
  niches: CatalogNicheDto[];
  segments: string[];
  states: string[];
}

export interface DirectoryPageDto {
  facets: DirectoryFacetsDto;
  items: DirectoryEntryDto[];
  nextCursor: string | null;
  pageSize: number;
}

export type { CatalogViewer };
