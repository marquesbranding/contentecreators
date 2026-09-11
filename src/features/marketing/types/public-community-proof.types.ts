export type PublicCommunityCreatorType = "INFLUENCER" | "UGC";
export type PublicCommunitySocialPlatform =
  "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "OTHER" | "TIKTOK" | "X" | "YOUTUBE";

export interface PublicCommunityNicheDto {
  name: string;
  slug: string;
}

export interface PublicCommunityCreatorMetricDto {
  engagementRate: number | null;
  followerCount: number | null;
  platform: PublicCommunitySocialPlatform;
}

export interface PublicCommunityCompanyDto {
  city: string | null;
  companyId: string;
  segment: string | null;
  state: string | null;
  tradeName: string;
}

/**
 * Feeds the approved-brands marquee only. Creator and company cards moved to
 * the backoffice-managed landing showcase (`public-landing-showcase.types.ts`).
 */
export interface PublicCommunityProofDto {
  companies: PublicCommunityCompanyDto[];
}
