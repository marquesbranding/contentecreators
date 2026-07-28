import { sponsorshipPlacementActivationSchema } from "../schemas/sponsorship-placement.schema";
import {
  PUBLIC_SOCIAL_PROOF_ENABLED,
  type PlacementActivationInput,
  type PlacementAudience,
  type PlacementEvaluationInput,
  type PlacementEvaluationResult,
  type PlacementIssueCode,
  type PlacementViewer,
  type SponsorshipPlacementCandidate,
} from "../types/sponsorship-placement.types";

function uniqueIssues(issues: PlacementIssueCode[]) {
  return [...new Set(issues)];
}

function result(issues: PlacementIssueCode[]): PlacementEvaluationResult {
  const unique = uniqueIssues(issues);

  return {
    eligible: unique.length === 0,
    issues: unique,
  };
}

function activationPayload(placement: SponsorshipPlacementCandidate) {
  return {
    advertiserAccountId: placement.advertiserAccountId,
    advertiserLabel: placement.advertiserLabel,
    audience: placement.audience,
    body: placement.body,
    creativeAssetId: placement.creativeAssetId,
    endsAt: placement.endsAt,
    featuredCreatorProfileId: placement.featuredCreatorProfileId,
    isActive: true,
    linkLabel: placement.linkLabel,
    linkUrl: placement.linkUrl,
    placementType: placement.placementType,
    slotKey: placement.slotKey,
    sortOrder: placement.sortOrder,
    startsAt: placement.startsAt,
    title: placement.title,
  };
}

function isMediaEligible({ media, placement }: PlacementActivationInput) {
  if (placement.placementType === "FEATURED_CREATOR") {
    return true;
  }

  return Boolean(
    media &&
    placement.creativeAssetId === media.id &&
    media.bucketName === "sponsorship-media" &&
    media.kind === "SPONSORSHIP_CREATIVE" &&
    media.ownerAccountRole === "ADMIN" &&
    media.status === "ACTIVE" &&
    media.archivedAt === null,
  );
}

function isFeaturedCreatorEligible({
  featuredCreator,
  placement,
}: PlacementActivationInput) {
  if (placement.placementType !== "FEATURED_CREATOR") {
    return placement.featuredCreatorProfileId === null;
  }

  return Boolean(
    featuredCreator &&
    placement.featuredCreatorProfileId === featuredCreator.profileId &&
    featuredCreator.accountStatus === "APPROVED" &&
    featuredCreator.accountArchivedAt === null &&
    featuredCreator.profileArchivedAt === null &&
    featuredCreator.completionPercentage === 100,
  );
}

function audienceMatches(audience: PlacementAudience, viewer: PlacementViewer) {
  if (viewer === "PUBLIC") {
    return audience === "ALL";
  }

  if (viewer === "APPROVED_INFLUENCER") {
    return audience === "ALL" || audience === "INFLUENCER";
  }

  return audience === "ALL" || audience === "COMPANY";
}

export function validatePlacementForActivation(
  input: PlacementActivationInput,
): PlacementEvaluationResult {
  const issues: PlacementIssueCode[] = [];

  if (
    !sponsorshipPlacementActivationSchema.safeParse(
      activationPayload(input.placement),
    ).success
  ) {
    issues.push("CREATIVE_INCOMPLETE");
  }

  if (!isMediaEligible(input)) {
    issues.push("MEDIA_INELIGIBLE");
  }

  if (!isFeaturedCreatorEligible(input)) {
    issues.push("FEATURED_CREATOR_INELIGIBLE");
  }

  return result(issues);
}

export function evaluatePlacement(
  input: PlacementEvaluationInput,
): PlacementEvaluationResult {
  const issues = [...validatePlacementForActivation(input).issues];

  if (!input.placement.isActive) {
    issues.push("INACTIVE");
  }

  if (input.placement.archivedAt) {
    issues.push("ARCHIVED");
  }

  if (input.placement.startsAt && input.now < input.placement.startsAt) {
    issues.push("BEFORE_START");
  }

  if (input.placement.endsAt && input.now > input.placement.endsAt) {
    issues.push("AFTER_END");
  }

  if (!audienceMatches(input.placement.audience, input.viewer)) {
    issues.push("AUDIENCE_MISMATCH");
  }

  if (input.placement.slotKey !== input.slotKey) {
    issues.push("SLOT_MISMATCH");
  }

  if (!input.allowedPlacementTypes.includes(input.placement.placementType)) {
    issues.push("TYPE_MISMATCH");
  }

  const routeAllowsType =
    input.route === "PUBLIC_LANDING"
      ? input.placement.placementType === "TOP_BANNER"
      : true;

  if (!routeAllowsType) {
    issues.push("ROUTE_MISMATCH");
  }

  const publicSurface =
    input.route === "PUBLIC_LANDING" || input.viewer === "PUBLIC";
  const participantDerived =
    Boolean(input.placement.advertiserAccountId) ||
    input.placement.placementType === "FEATURED_CREATOR" ||
    Boolean(input.placement.featuredCreatorProfileId);

  if (publicSurface && participantDerived && !PUBLIC_SOCIAL_PROOF_ENABLED) {
    issues.push("PUBLIC_PARTICIPANT_CREATIVE_FORBIDDEN");
  }

  return result(issues);
}

export function isPlacementEligible(input: PlacementEvaluationInput) {
  return evaluatePlacement(input).eligible;
}

export function sortEligiblePlacements<
  Placement extends Pick<SponsorshipPlacementCandidate, "id" | "sortOrder">,
>(placements: readonly Placement[]): Placement[] {
  return [...placements].sort((left, right) => {
    const manualOrder = left.sortOrder - right.sortOrder;

    if (manualOrder !== 0 || left.id === right.id) {
      return manualOrder;
    }

    return left.id < right.id ? -1 : 1;
  });
}
