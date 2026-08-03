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

export interface PublicCommunityCreatorDto {
  bioExcerpt: string | null;
  city: string | null;
  creatorId: string;
  creatorType: PublicCommunityCreatorType;
  displayName: string;
  metric: PublicCommunityCreatorMetricDto | null;
  niches: PublicCommunityNicheDto[];
  state: string | null;
}

export interface PublicCommunityCompanyDto {
  city: string | null;
  companyId: string;
  segment: string | null;
  state: string | null;
  tradeName: string;
}

export interface PublicCommunityProofDto {
  companies: PublicCommunityCompanyDto[];
  creators: PublicCommunityCreatorDto[];
}
