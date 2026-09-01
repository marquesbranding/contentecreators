import "server-only";

import type {
  FeaturedCreatorEligibility,
  PlacementRoute,
  PlacementType,
  PlacementViewer,
  SponsorshipMediaReference,
  SponsorshipPlacementCandidate,
} from "../../types/sponsorship-placement.types";

export interface SponsorshipFeaturedPresentationRecord {
  avatarAssetId: string | null;
  displayName: string;
}

export interface SponsorshipDeliveryCandidateRecord {
  featuredCreator: FeaturedCreatorEligibility | null;
  featuredPresentation: SponsorshipFeaturedPresentationRecord | null;
  media: SponsorshipMediaReference | null;
  mediaMobile: SponsorshipMediaReference | null;
  mediaTablet: SponsorshipMediaReference | null;
  placement: SponsorshipPlacementCandidate;
}

export interface SponsorshipDeliveryQuery {
  allowedPlacementTypes: readonly PlacementType[];
  limit: number;
  now: Date;
  route: PlacementRoute;
  slotKey: string;
  viewer: PlacementViewer;
}

export interface SponsorshipDeliveryRepository {
  listCandidates(
    query: SponsorshipDeliveryQuery,
  ): Promise<SponsorshipDeliveryCandidateRecord[]>;
}

export interface SponsorshipMediaSigningTarget {
  bucketName: "profile-media" | "sponsorship-media";
  height: number | null;
  objectPath: string;
  width: number | null;
}

export interface SponsorshipDeliveryDataSource extends SponsorshipDeliveryRepository {
  findSigningTarget(input: {
    assetId: string;
    now: Date;
    placementId: string;
  }): Promise<SponsorshipMediaSigningTarget | null>;
}
