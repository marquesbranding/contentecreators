export const PLACEMENT_TYPES = [
  "TOP_BANNER",
  "INLINE_BANNER",
  "CAROUSEL",
  "FEATURED_CREATOR",
] as const;

export const PLACEMENT_AUDIENCES = ["ALL", "INFLUENCER", "COMPANY"] as const;

export const PUBLIC_SOCIAL_PROOF_ENABLED = false;

export type PlacementType = (typeof PLACEMENT_TYPES)[number];
export type PlacementAudience = (typeof PLACEMENT_AUDIENCES)[number];
export type PlacementRoute = "PUBLIC_LANDING" | "CATALOG";
export type PlacementViewer =
  "PUBLIC" | "APPROVED_INFLUENCER" | "APPROVED_COMPANY";

export interface PlacementCreative {
  assetId: string | null;
  body: string | null;
  linkLabel: string | null;
  linkUrl: string | null;
  participantDerived: boolean;
  title: string | null;
}

export interface SponsorshipPlacementDraft {
  advertiserAccountId: string | null;
  advertiserLabel: string | null;
  audience: PlacementAudience;
  body: string | null;
  creativeAssetId: string | null;
  endsAt: Date | null;
  featuredCreatorProfileId: string | null;
  isActive: boolean;
  linkLabel: string | null;
  linkUrl: string | null;
  placementType: PlacementType;
  slotKey: string;
  sortOrder: number;
  startsAt: Date | null;
  title: string | null;
}

export interface SponsorshipPlacementCandidate extends SponsorshipPlacementDraft {
  archivedAt: Date | null;
  id: string;
}

export interface SponsorshipMediaReference {
  archivedAt: Date | null;
  bucketName: string;
  id: string;
  kind: string;
  ownerAccountRole: "ADMIN" | "COMPANY" | "INFLUENCER" | null;
  status: string;
}

export interface FeaturedCreatorEligibility {
  accountArchivedAt: Date | null;
  accountStatus:
    | "ONBOARDING"
    | "PENDING_REVIEW"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "SUSPENDED"
    | "BANNED";
  completionPercentage: number;
  profileArchivedAt: Date | null;
  profileId: string;
}

export type PlacementIssueCode =
  | "AFTER_END"
  | "ARCHIVED"
  | "AUDIENCE_MISMATCH"
  | "BEFORE_START"
  | "CREATIVE_INCOMPLETE"
  | "FEATURED_CREATOR_INELIGIBLE"
  | "INACTIVE"
  | "MEDIA_INELIGIBLE"
  | "PUBLIC_PARTICIPANT_CREATIVE_FORBIDDEN"
  | "ROUTE_MISMATCH"
  | "SLOT_MISMATCH"
  | "TYPE_MISMATCH";

export interface PlacementEvaluationResult {
  eligible: boolean;
  issues: PlacementIssueCode[];
}

export interface PlacementActivationInput {
  featuredCreator: FeaturedCreatorEligibility | null;
  media: SponsorshipMediaReference | null;
  placement: SponsorshipPlacementCandidate;
}

export interface PlacementEvaluationInput extends PlacementActivationInput {
  allowedPlacementTypes: readonly PlacementType[];
  now: Date;
  route: PlacementRoute;
  slotKey: string;
  viewer: PlacementViewer;
}

export interface RendererPlacementMediaDto {
  alt: string;
  url: string;
}

export interface RendererFeaturedCreatorDto {
  avatar: RendererPlacementMediaDto | null;
  creatorId: string;
  displayName: string;
}

export interface RendererPlacementDto {
  body: string | null;
  eligible: true;
  featuredCreator?: RendererFeaturedCreatorDto | null;
  id: string;
  linkLabel: string | null;
  linkUrl: string | null;
  media: RendererPlacementMediaDto | null;
  sortOrder: number;
  title: string;
  type: PlacementType;
}
