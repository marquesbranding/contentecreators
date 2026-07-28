import "server-only";

import type { ApplicationTransaction } from "@/db/client";

import type {
  CatalogCreatorType,
  CatalogSocialPlatform,
  CatalogViewer,
} from "../../types/creator-catalog.types";

export interface CatalogCreatorContactRecord {
  consentIsActive: boolean;
  email: string | null;
  emailVisible: boolean;
  socialVisible: boolean;
  whatsappE164: string | null;
  whatsappVisible: boolean;
}

export interface CatalogCreatorDetailRecord {
  avatarAssetId: string | null;
  bio: string;
  city: string;
  contact: CatalogCreatorContactRecord | null;
  coverAssetId: string | null;
  creatorId: string;
  creatorType: CatalogCreatorType;
  displayName: string;
  media: {
    id: string;
    kind: "AVATAR" | "COVER";
  }[];
  metrics: {
    engagementRate: string | null;
    followerCount: number | null;
    observedOn: Date;
    platform: CatalogSocialPlatform;
    source: "SELF_REPORTED";
  }[];
  niches: {
    name: string;
    slug: string;
  }[];
  socialProfiles: {
    handle: string | null;
    normalizedUrl: string;
    platform: CatalogSocialPlatform;
  }[];
  state: string;
}

export type FindEligibleCatalogCreator = (
  transaction: ApplicationTransaction,
  creatorId: string,
  viewer: CatalogViewer,
) => Promise<CatalogCreatorDetailRecord | null>;
