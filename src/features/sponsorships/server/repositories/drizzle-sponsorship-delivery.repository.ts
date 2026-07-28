import "server-only";

import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDatabaseClient, type ApplicationDatabase } from "@/db/client";
import {
  accounts,
  creatorProfiles,
  mediaAssets,
  sponsorshipPlacements,
} from "@/db/schema";

import { PUBLIC_SOCIAL_PROOF_ENABLED } from "../../types/sponsorship-placement.types";
import type {
  SponsorshipDeliveryCandidateRecord,
  SponsorshipDeliveryDataSource,
  SponsorshipDeliveryQuery,
  SponsorshipMediaSigningTarget,
} from "./sponsorship-delivery.repository";

const mediaOwnerAccounts = alias(accounts, "sponsorship_delivery_media_owner");
const creatorAccounts = alias(accounts, "sponsorship_delivery_creator_account");
const signingMediaOwnerAccounts = alias(
  accounts,
  "sponsorship_signing_media_owner",
);
const signingCreatorAccounts = alias(
  accounts,
  "sponsorship_signing_creator_account",
);

function allowedAudiences(query: SponsorshipDeliveryQuery) {
  if (query.viewer === "PUBLIC") {
    return ["ALL"] as const;
  }

  return query.viewer === "APPROVED_COMPANY"
    ? (["ALL", "COMPANY"] as const)
    : (["ALL", "INFLUENCER"] as const);
}

function allowedPlacementTypes(query: SponsorshipDeliveryQuery) {
  const uniqueTypes = [...new Set(query.allowedPlacementTypes)];

  return query.route === "PUBLIC_LANDING"
    ? uniqueTypes.filter((type) => type === "TOP_BANNER")
    : uniqueTypes;
}

function deliveryPredicates(
  query: SponsorshipDeliveryQuery,
  placementTypes: ReturnType<typeof allowedPlacementTypes>,
) {
  const predicates: SQL[] = [
    eq(sponsorshipPlacements.slotKey, query.slotKey),
    eq(sponsorshipPlacements.isActive, true),
    isNull(sponsorshipPlacements.archivedAt),
    or(
      isNull(sponsorshipPlacements.startsAt),
      lte(sponsorshipPlacements.startsAt, query.now),
    )!,
    or(
      isNull(sponsorshipPlacements.endsAt),
      gte(sponsorshipPlacements.endsAt, query.now),
    )!,
    inArray(sponsorshipPlacements.audience, allowedAudiences(query)),
    inArray(sponsorshipPlacements.placementType, placementTypes),
  ];
  const publicSurface =
    query.route === "PUBLIC_LANDING" || query.viewer === "PUBLIC";

  if (publicSurface && !PUBLIC_SOCIAL_PROOF_ENABLED) {
    predicates.push(
      isNull(sponsorshipPlacements.advertiserAccountId),
      isNull(sponsorshipPlacements.featuredCreatorProfileId),
      ne(sponsorshipPlacements.placementType, "FEATURED_CREATOR"),
    );
  }

  return and(...predicates);
}

function mapCandidate(
  row: Awaited<ReturnType<typeof selectCandidates>>[number],
): SponsorshipDeliveryCandidateRecord {
  return {
    featuredCreator:
      row.featuredCreatorProfileId &&
      row.creatorProfileId &&
      row.creatorAccountStatus &&
      row.creatorAccountRole === "INFLUENCER"
        ? {
            accountArchivedAt: row.creatorAccountArchivedAt,
            accountStatus: row.creatorAccountStatus,
            completionPercentage: row.creatorCompletionPercentage ?? 0,
            profileArchivedAt: row.creatorProfileArchivedAt,
            profileId: row.creatorProfileId,
          }
        : null,
    featuredPresentation:
      row.featuredCreatorProfileId &&
      row.creatorProfileId &&
      row.creatorDisplayName
        ? {
            avatarAssetId: row.creatorAvatarAssetId,
            displayName: row.creatorDisplayName,
          }
        : null,
    media: row.mediaId
      ? {
          archivedAt: row.mediaArchivedAt,
          bucketName: row.mediaBucketName ?? "",
          id: row.mediaId,
          kind: row.mediaKind ?? "",
          ownerAccountRole: row.mediaOwnerAccountRole,
          status: row.mediaStatus ?? "",
        }
      : null,
    placement: {
      advertiserAccountId: row.advertiserAccountId,
      advertiserLabel: row.advertiserLabel,
      archivedAt: row.archivedAt,
      audience: row.audience,
      body: row.body,
      creativeAssetId: row.creativeAssetId,
      endsAt: row.endsAt,
      featuredCreatorProfileId: row.featuredCreatorProfileId,
      id: row.id,
      isActive: row.isActive,
      linkLabel: row.linkLabel,
      linkUrl: row.linkUrl,
      placementType: row.placementType,
      slotKey: row.slotKey,
      sortOrder: row.sortOrder,
      startsAt: row.startsAt,
      title: row.title,
    },
  };
}

function selectCandidates(
  database: ApplicationDatabase,
  query: SponsorshipDeliveryQuery,
  placementTypes: ReturnType<typeof allowedPlacementTypes>,
) {
  const requestedLimit = Math.min(20, Math.max(1, Math.trunc(query.limit)));
  const resilientLimit = Math.min(100, requestedLimit * 4);

  return database
    .select({
      advertiserAccountId: sponsorshipPlacements.advertiserAccountId,
      advertiserLabel: sponsorshipPlacements.advertiserLabel,
      archivedAt: sponsorshipPlacements.archivedAt,
      audience: sponsorshipPlacements.audience,
      body: sponsorshipPlacements.body,
      creativeAssetId: sponsorshipPlacements.creativeAssetId,
      creatorAccountArchivedAt: creatorAccounts.archivedAt,
      creatorAccountRole: creatorAccounts.role,
      creatorAccountStatus: creatorAccounts.status,
      creatorAvatarAssetId: creatorProfiles.avatarAssetId,
      creatorCompletionPercentage: creatorAccounts.completionPercentage,
      creatorDisplayName: creatorProfiles.displayName,
      creatorProfileArchivedAt: creatorProfiles.archivedAt,
      creatorProfileId: creatorProfiles.id,
      endsAt: sponsorshipPlacements.endsAt,
      featuredCreatorProfileId: sponsorshipPlacements.featuredCreatorProfileId,
      id: sponsorshipPlacements.id,
      isActive: sponsorshipPlacements.isActive,
      linkLabel: sponsorshipPlacements.linkLabel,
      linkUrl: sponsorshipPlacements.linkUrl,
      mediaArchivedAt: mediaAssets.archivedAt,
      mediaBucketName: mediaAssets.bucketName,
      mediaId: mediaAssets.id,
      mediaKind: mediaAssets.kind,
      mediaOwnerAccountRole: mediaOwnerAccounts.role,
      mediaStatus: mediaAssets.status,
      placementType: sponsorshipPlacements.placementType,
      slotKey: sponsorshipPlacements.slotKey,
      sortOrder: sponsorshipPlacements.sortOrder,
      startsAt: sponsorshipPlacements.startsAt,
      title: sponsorshipPlacements.title,
    })
    .from(sponsorshipPlacements)
    .leftJoin(
      mediaAssets,
      eq(mediaAssets.id, sponsorshipPlacements.creativeAssetId),
    )
    .leftJoin(
      mediaOwnerAccounts,
      eq(mediaOwnerAccounts.id, mediaAssets.ownerAccountId),
    )
    .leftJoin(
      creatorProfiles,
      eq(creatorProfiles.id, sponsorshipPlacements.featuredCreatorProfileId),
    )
    .leftJoin(
      creatorAccounts,
      eq(creatorAccounts.id, creatorProfiles.accountId),
    )
    .where(deliveryPredicates(query, placementTypes))
    .orderBy(
      asc(sponsorshipPlacements.sortOrder),
      asc(sponsorshipPlacements.id),
    )
    .limit(resilientLimit);
}

async function findSigningTarget(
  database: ApplicationDatabase,
  input: {
    assetId: string;
    now: Date;
    placementId: string;
  },
): Promise<SponsorshipMediaSigningTarget | null> {
  const [target] = await database
    .select({
      bucketName: mediaAssets.bucketName,
      height: mediaAssets.height,
      objectPath: mediaAssets.objectPath,
      width: mediaAssets.width,
    })
    .from(sponsorshipPlacements)
    .innerJoin(mediaAssets, eq(mediaAssets.id, input.assetId))
    .leftJoin(
      signingMediaOwnerAccounts,
      eq(signingMediaOwnerAccounts.id, mediaAssets.ownerAccountId),
    )
    .leftJoin(
      creatorProfiles,
      eq(creatorProfiles.id, sponsorshipPlacements.featuredCreatorProfileId),
    )
    .leftJoin(
      signingCreatorAccounts,
      eq(signingCreatorAccounts.id, creatorProfiles.accountId),
    )
    .where(
      and(
        eq(sponsorshipPlacements.id, input.placementId),
        eq(sponsorshipPlacements.isActive, true),
        isNull(sponsorshipPlacements.archivedAt),
        isNull(mediaAssets.archivedAt),
        eq(mediaAssets.status, "ACTIVE"),
        or(
          isNull(sponsorshipPlacements.startsAt),
          lte(sponsorshipPlacements.startsAt, input.now),
        ),
        or(
          isNull(sponsorshipPlacements.endsAt),
          gte(sponsorshipPlacements.endsAt, input.now),
        ),
        or(
          and(
            eq(sponsorshipPlacements.creativeAssetId, input.assetId),
            eq(mediaAssets.bucketName, "sponsorship-media"),
            eq(mediaAssets.kind, "SPONSORSHIP_CREATIVE"),
            eq(signingMediaOwnerAccounts.role, "ADMIN"),
            isNull(signingMediaOwnerAccounts.archivedAt),
          ),
          and(
            eq(sponsorshipPlacements.placementType, "FEATURED_CREATOR"),
            eq(creatorProfiles.avatarAssetId, input.assetId),
            eq(mediaAssets.bucketName, "profile-media"),
            eq(mediaAssets.kind, "AVATAR"),
            eq(mediaAssets.ownerAccountId, signingCreatorAccounts.id),
            eq(signingCreatorAccounts.role, "INFLUENCER"),
            eq(signingCreatorAccounts.status, "APPROVED"),
            eq(signingCreatorAccounts.completionPercentage, 100),
            isNull(signingCreatorAccounts.archivedAt),
            isNull(creatorProfiles.archivedAt),
          ),
        ),
      ),
    )
    .limit(1);

  if (
    !target ||
    (target.bucketName !== "profile-media" &&
      target.bucketName !== "sponsorship-media")
  ) {
    return null;
  }

  return {
    bucketName: target.bucketName,
    height: target.height,
    objectPath: target.objectPath,
    width: target.width,
  };
}

export function createDrizzleSponsorshipDeliveryRepository(
  database: ApplicationDatabase,
): SponsorshipDeliveryDataSource {
  return {
    findSigningTarget: (input) => findSigningTarget(database, input),
    async listCandidates(query) {
      const placementTypes = allowedPlacementTypes(query);

      if (placementTypes.length === 0) {
        return [];
      }

      const rows = await selectCandidates(database, query, placementTypes);

      return rows.map(mapCandidate);
    },
  };
}

export function createServerSponsorshipDeliveryRepository() {
  return createDrizzleSponsorshipDeliveryRepository(
    getDatabaseClient().database,
  );
}
