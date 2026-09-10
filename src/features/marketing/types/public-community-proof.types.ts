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

/** A short-lived signed URL for a public avatar, plus its intrinsic size. */
export interface PublicCommunityAvatarDto {
  height: number | null;
  url: string;
  width: number | null;
}

export interface PublicCommunityCreatorDto {
  /** Only curated (`is_featured`) creators carry a photo — see `docs/security/threat-model.md`, TM-PUBLIC-01. */
  avatar: PublicCommunityAvatarDto | null;
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

/**
 * What the repository returns before delivery: the unsigned storage
 * coordinates of the avatar, which never leave the server. The route's DTO
 * carries the signed URL instead.
 */
export interface PublicCommunityAvatarSource {
  bucketName: string;
  height: number | null;
  objectPath: string;
  width: number | null;
}

export interface PublicCommunityCreatorSource extends Omit<
  PublicCommunityCreatorDto,
  "avatar"
> {
  avatarSource: PublicCommunityAvatarSource | null;
}

export interface PublicCommunityProofSource {
  companies: PublicCommunityCompanyDto[];
  creators: PublicCommunityCreatorSource[];
}
