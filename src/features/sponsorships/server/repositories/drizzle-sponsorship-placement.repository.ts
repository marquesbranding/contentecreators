import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  notExists,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import {
  accounts,
  creatorProfiles,
  mediaAssets,
  sponsorshipPlacements,
} from "@/db/schema";

import type {
  AdminSponsorshipPlacementRepository,
  SponsorshipActivationMediaEvidence,
  SponsorshipPlacementCreateData,
  SponsorshipPlacementListFilters,
  SponsorshipPlacementRecord,
  SponsorshipPlacementReorderItem,
  SponsorshipPlacementUpdateData,
} from "./sponsorship-placement.repository";
import { SponsorshipPlacementRepositoryError } from "./sponsorship-placement.repository";

async function resolveWriteFailure(
  transaction: ApplicationTransaction,
  placementId: string,
): Promise<never> {
  const [current] = await transaction
    .select({
      archivedAt: sponsorshipPlacements.archivedAt,
      id: sponsorshipPlacements.id,
    })
    .from(sponsorshipPlacements)
    .where(eq(sponsorshipPlacements.id, placementId))
    .limit(1);

  if (!current || current.archivedAt) {
    throw new SponsorshipPlacementRepositoryError("NOT_FOUND");
  }

  throw new SponsorshipPlacementRepositoryError("VERSION_CONFLICT");
}

function buildListPredicates(
  filters: SponsorshipPlacementListFilters,
  now: Date,
) {
  const predicates: SQL[] = [];

  if (filters.archive === "ARCHIVED" || filters.state === "ARCHIVED") {
    predicates.push(isNotNull(sponsorshipPlacements.archivedAt));
  } else if (filters.archive !== "ALL") {
    predicates.push(isNull(sponsorshipPlacements.archivedAt));
  }

  if (filters.audience) {
    predicates.push(eq(sponsorshipPlacements.audience, filters.audience));
  }

  if (filters.placementType) {
    predicates.push(
      eq(sponsorshipPlacements.placementType, filters.placementType),
    );
  }

  if (filters.isActive !== undefined) {
    predicates.push(eq(sponsorshipPlacements.isActive, filters.isActive));
  }

  const search = filters.search?.trim();

  if (search) {
    const pattern = `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    predicates.push(
      or(
        ilike(sponsorshipPlacements.title, pattern),
        ilike(sponsorshipPlacements.advertiserLabel, pattern),
        ilike(sponsorshipPlacements.slotKey, pattern),
      )!,
    );
  }

  if (filters.state === "DRAFT") {
    predicates.push(
      isNull(sponsorshipPlacements.archivedAt),
      eq(sponsorshipPlacements.isActive, false),
    );
  } else if (filters.state === "SCHEDULED") {
    predicates.push(
      isNull(sponsorshipPlacements.archivedAt),
      eq(sponsorshipPlacements.isActive, true),
      gt(sponsorshipPlacements.startsAt, now),
    );
  } else if (filters.state === "EXPIRED") {
    predicates.push(
      isNull(sponsorshipPlacements.archivedAt),
      eq(sponsorshipPlacements.isActive, true),
      isNotNull(sponsorshipPlacements.endsAt),
      lt(sponsorshipPlacements.endsAt, now),
    );
  } else if (filters.state === "ACTIVE") {
    predicates.push(
      isNull(sponsorshipPlacements.archivedAt),
      eq(sponsorshipPlacements.isActive, true),
      or(
        isNull(sponsorshipPlacements.startsAt),
        lt(sponsorshipPlacements.startsAt, now),
        eq(sponsorshipPlacements.startsAt, now),
      )!,
      or(
        isNull(sponsorshipPlacements.endsAt),
        gt(sponsorshipPlacements.endsAt, now),
        eq(sponsorshipPlacements.endsAt, now),
      )!,
    );
  }

  return predicates;
}

async function createPlacement(
  transaction: ApplicationTransaction,
  data: SponsorshipPlacementCreateData,
) {
  // New placements always land last — order is only ever changed afterward
  // by dragging the list, so whatever sortOrder the caller passed is
  // discarded in favor of one past every existing (non-archived) placement.
  const [{ maxSortOrder }] = await transaction
    .select({
      maxSortOrder: sql<number | null>`max(${sponsorshipPlacements.sortOrder})`,
    })
    .from(sponsorshipPlacements)
    .where(isNull(sponsorshipPlacements.archivedAt));
  const nextSortOrder = (maxSortOrder ?? -10) + 10;

  const [created] = await transaction
    .insert(sponsorshipPlacements)
    .values({ ...data, sortOrder: nextSortOrder })
    .returning();

  if (!created) {
    throw new Error("Sponsorship placement creation returned no record.");
  }

  return created;
}

async function findPlacement(
  transaction: ApplicationTransaction,
  placementId: string,
  includeArchived = false,
) {
  const [placement] = await transaction
    .select()
    .from(sponsorshipPlacements)
    .where(
      and(
        eq(sponsorshipPlacements.id, placementId),
        includeArchived ? undefined : isNull(sponsorshipPlacements.archivedAt),
      ),
    )
    .limit(1);

  return placement ?? null;
}

async function updatePlacement(
  transaction: ApplicationTransaction,
  placementId: string,
  expectedVersion: number,
  patch: SponsorshipPlacementUpdateData,
) {
  const [updated] = await transaction
    .update(sponsorshipPlacements)
    .set(patch)
    .where(
      and(
        eq(sponsorshipPlacements.id, placementId),
        eq(sponsorshipPlacements.version, expectedVersion),
        isNull(sponsorshipPlacements.archivedAt),
      ),
    )
    .returning();

  return updated ?? resolveWriteFailure(transaction, placementId);
}

async function setPlacementActive(
  transaction: ApplicationTransaction,
  placementId: string,
  expectedVersion: number,
  isActive: boolean,
) {
  const [updated] = await transaction
    .update(sponsorshipPlacements)
    .set({ isActive })
    .where(
      and(
        eq(sponsorshipPlacements.id, placementId),
        eq(sponsorshipPlacements.version, expectedVersion),
        isNull(sponsorshipPlacements.archivedAt),
      ),
    )
    .returning();

  return updated ?? resolveWriteFailure(transaction, placementId);
}

async function archivePlacement(
  transaction: ApplicationTransaction,
  placementId: string,
  expectedVersion: number,
) {
  const [archived] = await transaction
    .update(sponsorshipPlacements)
    .set({
      archivedAt: new Date(),
      isActive: false,
    })
    .where(
      and(
        eq(sponsorshipPlacements.id, placementId),
        eq(sponsorshipPlacements.version, expectedVersion),
        isNull(sponsorshipPlacements.archivedAt),
      ),
    )
    .returning();

  return archived ?? resolveWriteFailure(transaction, placementId);
}

async function archiveReplacedCreativeIfUnreferenced(
  transaction: ApplicationTransaction,
  assetId: string,
  replacementAssetId: string,
) {
  const [archived] = await transaction
    .update(mediaAssets)
    .set({
      archivedAt: new Date(),
      replacedByAssetId: replacementAssetId,
      status: "ARCHIVED",
      updatedAt: new Date(),
      version: sql`${mediaAssets.version} + 1`,
    })
    .where(
      and(
        eq(mediaAssets.id, assetId),
        eq(mediaAssets.bucketName, "sponsorship-media"),
        eq(mediaAssets.kind, "SPONSORSHIP_CREATIVE"),
        eq(mediaAssets.status, "ACTIVE"),
        isNull(mediaAssets.archivedAt),
        exists(
          transaction
            .select({ id: accounts.id })
            .from(accounts)
            .where(
              and(
                eq(accounts.id, mediaAssets.ownerAccountId),
                eq(accounts.role, "ADMIN"),
                isNull(accounts.archivedAt),
              ),
            ),
        ),
        notExists(
          transaction
            .select({ id: sponsorshipPlacements.id })
            .from(sponsorshipPlacements)
            .where(
              and(
                or(
                  eq(sponsorshipPlacements.creativeAssetId, assetId),
                  eq(sponsorshipPlacements.creativeAssetTabletId, assetId),
                  eq(sponsorshipPlacements.creativeAssetMobileId, assetId),
                )!,
                isNull(sponsorshipPlacements.archivedAt),
              ),
            ),
        ),
      ),
    )
    .returning({ id: mediaAssets.id });

  return Boolean(archived);
}

async function reorderPlacements(
  transaction: ApplicationTransaction,
  items: SponsorshipPlacementReorderItem[],
) {
  const updated: SponsorshipPlacementRecord[] = [];

  for (const item of items) {
    updated.push(
      await updatePlacement(
        transaction,
        item.placementId,
        item.expectedVersion,
        { sortOrder: item.sortOrder },
      ),
    );
  }

  return updated;
}

async function resolveCreativeEvidence(
  transaction: ApplicationTransaction,
  assetId: string | null,
) {
  if (!assetId) {
    return null;
  }

  const [media] = await transaction
    .select({
      archivedAt: mediaAssets.archivedAt,
      bucketName: mediaAssets.bucketName,
      height: mediaAssets.height,
      id: mediaAssets.id,
      kind: mediaAssets.kind,
      mimeType: mediaAssets.mimeType,
      ownerAccountId: mediaAssets.ownerAccountId,
      ownerAccountRole: accounts.role,
      sizeBytes: mediaAssets.sizeBytes,
      status: mediaAssets.status,
      width: mediaAssets.width,
    })
    .from(mediaAssets)
    .innerJoin(accounts, eq(accounts.id, mediaAssets.ownerAccountId))
    .where(eq(mediaAssets.id, assetId))
    .limit(1)
    .for("update", { of: mediaAssets });

  return media ?? null;
}

async function findActivationEvidence(
  transaction: ApplicationTransaction,
  placementId: string,
) {
  const [placement] = await transaction
    .select()
    .from(sponsorshipPlacements)
    .where(
      and(
        eq(sponsorshipPlacements.id, placementId),
        isNull(sponsorshipPlacements.archivedAt),
      ),
    )
    .limit(1)
    .for("update");

  if (!placement) {
    return null;
  }

  const [media, mediaTablet, mediaMobile] = await Promise.all([
    resolveCreativeEvidence(transaction, placement.creativeAssetId),
    resolveCreativeEvidence(transaction, placement.creativeAssetTabletId),
    resolveCreativeEvidence(transaction, placement.creativeAssetMobileId),
  ]);
  const [featuredCreator] = placement.featuredCreatorProfileId
    ? await transaction
        .select({
          accountArchivedAt: accounts.archivedAt,
          accountStatus: accounts.status,
          completionPercentage: accounts.completionPercentage,
          profileArchivedAt: creatorProfiles.archivedAt,
          profileId: creatorProfiles.id,
        })
        .from(creatorProfiles)
        .innerJoin(accounts, eq(accounts.id, creatorProfiles.accountId))
        .where(eq(creatorProfiles.id, placement.featuredCreatorProfileId))
        .limit(1)
    : [];

  return {
    featuredCreator: featuredCreator ?? null,
    media,
    mediaMobile,
    mediaTablet,
    placement,
  };
}

async function promotePendingCreative(
  transaction: ApplicationTransaction,
  assetId: string,
  ownerAccountId: string,
): Promise<SponsorshipActivationMediaEvidence | null> {
  const [promoted] = await transaction
    .update(mediaAssets)
    .set({
      status: "ACTIVE",
      updatedAt: new Date(),
      version: sql`${mediaAssets.version} + 1`,
    })
    .where(
      and(
        eq(mediaAssets.id, assetId),
        eq(mediaAssets.ownerAccountId, ownerAccountId),
        eq(mediaAssets.bucketName, "sponsorship-media"),
        eq(mediaAssets.kind, "SPONSORSHIP_CREATIVE"),
        eq(mediaAssets.status, "PENDING"),
        inArray(mediaAssets.mimeType, [
          "image/jpeg",
          "image/png",
          "image/webp",
        ]),
        gt(mediaAssets.sizeBytes, 0),
        lte(mediaAssets.sizeBytes, 8 * 1024 * 1024),
        isNotNull(mediaAssets.width),
        isNotNull(mediaAssets.height),
        gt(mediaAssets.width, 0),
        gt(mediaAssets.height, 0),
        lte(mediaAssets.width, 16_384),
        lte(mediaAssets.height, 16_384),
        sql`${mediaAssets.width} * ${mediaAssets.height} <= 40000000`,
        isNull(mediaAssets.archivedAt),
      ),
    )
    .returning({
      archivedAt: mediaAssets.archivedAt,
      bucketName: mediaAssets.bucketName,
      height: mediaAssets.height,
      id: mediaAssets.id,
      kind: mediaAssets.kind,
      mimeType: mediaAssets.mimeType,
      ownerAccountId: mediaAssets.ownerAccountId,
      sizeBytes: mediaAssets.sizeBytes,
      status: mediaAssets.status,
      width: mediaAssets.width,
    });

  return promoted
    ? {
        ...promoted,
        ownerAccountRole: "ADMIN",
      }
    : null;
}

async function listPlacements(
  transaction: ApplicationTransaction,
  filters: SponsorshipPlacementListFilters,
) {
  const predicates = buildListPredicates(filters, new Date());
  const where = predicates.length > 0 ? and(...predicates) : undefined;
  const offset = (filters.page - 1) * filters.pageSize;
  const [items, [total]] = await Promise.all([
    transaction
      .select()
      .from(sponsorshipPlacements)
      .where(where)
      .orderBy(
        desc(sponsorshipPlacements.updatedAt),
        asc(sponsorshipPlacements.id),
      )
      .limit(filters.pageSize)
      .offset(offset),
    transaction
      .select({ value: count() })
      .from(sponsorshipPlacements)
      .where(where),
  ]);

  return {
    items,
    page: filters.page,
    pageSize: filters.pageSize,
    totalItems: total?.value ?? 0,
  };
}

export const drizzleSponsorshipPlacementRepository = {
  archiveReplacedCreativeIfUnreferenced,
  archive: archivePlacement,
  create: createPlacement,
  findActivationEvidence,
  findById: findPlacement,
  list: listPlacements,
  promotePendingCreative,
  reorder: reorderPlacements,
  setActive: setPlacementActive,
  update: updatePlacement,
} satisfies AdminSponsorshipPlacementRepository;
