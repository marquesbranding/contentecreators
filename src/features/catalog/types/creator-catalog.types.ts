export type CatalogViewerRole = "COMPANY" | "INFLUENCER";
export type CatalogCreatorType = "INFLUENCER" | "UGC";
export type CatalogSocialPlatform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "OTHER"
  | "TELEGRAM"
  | "THREADS"
  | "TIKTOK"
  | "X"
  | "YOUTUBE";

export interface CreatorCatalogFilters {
  city?: string;
  creatorType?: CatalogCreatorType;
  cursor?: string;
  niche?: string;
  pageSize: number;
  platform?: CatalogSocialPlatform;
  search?: string;
  state?: string;
}

export interface CreatorCatalogCursor {
  creatorProfileId: string;
  displayName: string;
}

export interface CreatorCatalogQuery extends Omit<
  CreatorCatalogFilters,
  "cursor"
> {
  cursor: CreatorCatalogCursor | null;
}

export interface CatalogNicheDto {
  name: string;
  slug: string;
}

export interface CatalogCardMetricDto {
  engagementRate: number | null;
  followerCount: number | null;
  handle: string | null;
  interactionCount: number | null;
  isPrimary: boolean;
  observedOn: string;
  platform: CatalogSocialPlatform;
  source: "SELF_REPORTED";
  viewCount: number | null;
}

/**
 * Deliberately narrow catalog-list projection. Contact, account, moderation,
 * audit and storage records never belong to this transport type.
 */
export interface CreatorCatalogCardDto {
  /**
   * Server-only reference used to exchange the active profile image for a
   * short-lived signed URL before the page crosses the browser boundary.
   */
  avatarAssetId?: string | null;
  bioExcerpt: string | null;
  /**
   * Server-only reference used to exchange the active cover image for a
   * short-lived signed URL before the page crosses the browser boundary.
   */
  coverAssetId?: string | null;
  city: string | null;
  creatorId: string;
  creatorType: CatalogCreatorType;
  displayName: string;
  metrics?: CatalogCardMetricDto[];
  niches: CatalogNicheDto[];
  socialPlatforms: CatalogSocialPlatform[];
  state: string | null;
}

export interface CreatorCatalogPageDto {
  items: CreatorCatalogCardDto[];
  nextCursor: string | null;
  pageSize: number;
}

export interface CatalogViewer {
  accountId: string;
  role: CatalogViewerRole;
}
