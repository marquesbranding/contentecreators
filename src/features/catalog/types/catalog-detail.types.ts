import type {
  CatalogCreatorType,
  CatalogSocialPlatform,
} from "./creator-catalog.types";

export interface CatalogCreatorLocationDto {
  city: string;
  state: string;
}

export interface CatalogCreatorNicheDto {
  name: string;
  slug: string;
}

export interface CatalogCreatorSocialDto {
  handle: string | null;
  platform: CatalogSocialPlatform;
}

export interface CatalogCreatorMetricDto {
  engagementRate: number | null;
  followerCount: number | null;
  interactionCount: number | null;
  isPrimary: boolean;
  observedOn: string;
  platform: CatalogSocialPlatform;
  source: "SELF_REPORTED";
  viewCount: number | null;
}

export interface CatalogMediaReferenceDto {
  assetId: string;
  kind: "AVATAR" | "COVER";
}

export type CatalogContactUnavailableReason =
  "CONSENT_NOT_GRANTED" | "NO_CONTACT_CHANNELS" | "VIEWER_NOT_COMPANY";

export type CatalogCreatorContactDto =
  | {
      reason: CatalogContactUnavailableReason;
      status: "UNAVAILABLE";
    }
  | {
      email: { href: string } | null;
      social: {
        href: string;
        platform: CatalogSocialPlatform;
      }[];
      status: "AVAILABLE";
      whatsapp: { href: string } | null;
    };

export interface CatalogCreatorDetailDto {
  bio: string;
  contact: CatalogCreatorContactDto;
  creatorId: string;
  creatorType: CatalogCreatorType;
  displayName: string;
  location: CatalogCreatorLocationDto;
  media: {
    avatar: CatalogMediaReferenceDto | null;
    cover: CatalogMediaReferenceDto | null;
  };
  metrics: CatalogCreatorMetricDto[];
  niches: CatalogCreatorNicheDto[];
  socialProfiles: CatalogCreatorSocialDto[];
}
