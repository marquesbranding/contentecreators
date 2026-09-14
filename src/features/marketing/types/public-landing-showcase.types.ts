import type {
  PublicCommunityCreatorMetricDto,
  PublicCommunityCreatorType,
  PublicCommunityNicheDto,
} from "./public-community-proof.types";

/** A short-lived signed URL for a public image, plus its intrinsic size. */
export interface PublicShowcaseImageDto {
  height: number | null;
  url: string;
  width: number | null;
}

/**
 * Profiles an admin enabled in the backoffice's landing management. Enabling
 * is the curation step that makes a photo or logo public — see
 * `docs/security/threat-model.md`, TM-PUBLIC-01. No contact data is carried.
 */
export interface PublicShowcaseCreatorDto {
  avatar: PublicShowcaseImageDto | null;
  bioExcerpt: string | null;
  city: string | null;
  cover: PublicShowcaseImageDto | null;
  creatorType: PublicCommunityCreatorType;
  displayName: string;
  id: string;
  kind: "CREATOR";
  metric: PublicCommunityCreatorMetricDto | null;
  niches: PublicCommunityNicheDto[];
  state: string | null;
}

export interface PublicShowcaseCompanyDto {
  city: string | null;
  cover: PublicShowcaseImageDto | null;
  id: string;
  kind: "COMPANY";
  logo: PublicShowcaseImageDto | null;
  segment: string | null;
  state: string | null;
  tradeName: string;
}

export type PublicShowcaseItemDto =
  PublicShowcaseCompanyDto | PublicShowcaseCreatorDto;

export interface PublicLandingShowcaseDto {
  /** Creators and companies already interleaved in carousel order. */
  items: PublicShowcaseItemDto[];
}

/** Unsigned storage coordinates; they never leave the server. */
export interface PublicShowcaseImageSource {
  bucketName: string;
  height: number | null;
  objectPath: string;
  width: number | null;
}

export interface PublicShowcaseCreatorSource extends Omit<
  PublicShowcaseCreatorDto,
  "avatar" | "cover" | "kind"
> {
  avatarSource: PublicShowcaseImageSource | null;
  coverSource: PublicShowcaseImageSource | null;
}

export interface PublicShowcaseCompanySource extends Omit<
  PublicShowcaseCompanyDto,
  "cover" | "kind" | "logo"
> {
  coverSource: PublicShowcaseImageSource | null;
  logoSource: PublicShowcaseImageSource | null;
}

export interface PublicLandingShowcaseSource {
  companies: PublicShowcaseCompanySource[];
  creators: PublicShowcaseCreatorSource[];
}
