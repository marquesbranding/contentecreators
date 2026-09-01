import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import type {
  NewSponsorshipPlacement,
  SponsorshipPlacement,
} from "@/db/schema";

import type {
  FeaturedCreatorEligibility,
  SponsorshipMediaReference,
} from "../../types/sponsorship-placement.types";

export type SponsorshipPlacementRecord = SponsorshipPlacement;

export interface SponsorshipActivationMediaEvidence extends SponsorshipMediaReference {
  height: number | null;
  mimeType: string;
  ownerAccountId: string;
  sizeBytes: number;
  width: number | null;
}

export type SponsorshipPlacementCreateData = Pick<
  NewSponsorshipPlacement,
  | "advertiserAccountId"
  | "advertiserLabel"
  | "audience"
  | "body"
  | "creativeAssetId"
  | "creativeAssetMobileId"
  | "creativeAssetTabletId"
  | "endsAt"
  | "featuredCreatorProfileId"
  | "linkLabel"
  | "linkUrl"
  | "placementType"
  | "slotKey"
  | "sortOrder"
  | "startsAt"
  | "title"
> & { isActive: false };

export type SponsorshipPlacementUpdateData = Partial<
  Omit<SponsorshipPlacementCreateData, "isActive">
>;

export interface SponsorshipActivationEvidence {
  featuredCreator: FeaturedCreatorEligibility | null;
  media: SponsorshipActivationMediaEvidence | null;
  mediaMobile: SponsorshipActivationMediaEvidence | null;
  mediaTablet: SponsorshipActivationMediaEvidence | null;
  placement: SponsorshipPlacementRecord;
}

export interface SponsorshipPlacementListFilters {
  archive?: "ACTIVE" | "ALL" | "ARCHIVED";
  audience?: SponsorshipPlacementRecord["audience"];
  isActive?: boolean;
  page: number;
  pageSize: number;
  placementType?: SponsorshipPlacementRecord["placementType"];
  search?: string;
  state?: "ACTIVE" | "ARCHIVED" | "DRAFT" | "EXPIRED" | "SCHEDULED";
}

export interface SponsorshipPlacementListResult {
  items: SponsorshipPlacementRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface SponsorshipPlacementReorderItem {
  expectedVersion: number;
  placementId: string;
  sortOrder: number;
}

export type SponsorshipPlacementRepositoryErrorCode =
  "NOT_FOUND" | "VERSION_CONFLICT";

export class SponsorshipPlacementRepositoryError extends Error {
  constructor(readonly code: SponsorshipPlacementRepositoryErrorCode) {
    super(code);
    this.name = "SponsorshipPlacementRepositoryError";
  }
}

export interface AdminSponsorshipPlacementRepository {
  archiveReplacedCreativeIfUnreferenced(
    transaction: ApplicationTransaction,
    assetId: string,
    replacementAssetId: string,
  ): Promise<boolean>;
  archive(
    transaction: ApplicationTransaction,
    placementId: string,
    expectedVersion: number,
  ): Promise<SponsorshipPlacementRecord>;
  create(
    transaction: ApplicationTransaction,
    data: SponsorshipPlacementCreateData,
  ): Promise<SponsorshipPlacementRecord>;
  findActivationEvidence(
    transaction: ApplicationTransaction,
    placementId: string,
  ): Promise<SponsorshipActivationEvidence | null>;
  findById(
    transaction: ApplicationTransaction,
    placementId: string,
    includeArchived?: boolean,
  ): Promise<SponsorshipPlacementRecord | null>;
  list(
    transaction: ApplicationTransaction,
    filters: SponsorshipPlacementListFilters,
  ): Promise<SponsorshipPlacementListResult>;
  promotePendingCreative(
    transaction: ApplicationTransaction,
    assetId: string,
    ownerAccountId: string,
  ): Promise<SponsorshipActivationMediaEvidence | null>;
  reorder(
    transaction: ApplicationTransaction,
    items: SponsorshipPlacementReorderItem[],
  ): Promise<SponsorshipPlacementRecord[]>;
  setActive(
    transaction: ApplicationTransaction,
    placementId: string,
    expectedVersion: number,
    isActive: boolean,
  ): Promise<SponsorshipPlacementRecord>;
  update(
    transaction: ApplicationTransaction,
    placementId: string,
    expectedVersion: number,
    patch: SponsorshipPlacementUpdateData,
  ): Promise<SponsorshipPlacementRecord>;
}
