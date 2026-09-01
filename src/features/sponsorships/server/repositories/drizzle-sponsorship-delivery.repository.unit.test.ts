import { describe, expect, it, vi } from "vitest";

import type { ApplicationDatabase } from "@/db/client";

import { createDrizzleSponsorshipDeliveryRepository } from "./drizzle-sponsorship-delivery.repository";

function createQueryDatabase(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    limit: vi.fn(async () => rows),
    orderBy: vi.fn(),
    where: vi.fn(),
  };

  for (const method of [
    "from",
    "innerJoin",
    "leftJoin",
    "orderBy",
    "where",
  ] as const) {
    query[method].mockReturnValue(query);
  }

  const select = vi.fn(() => query);
  const database = { select } as unknown as ApplicationDatabase;

  return { database, query, select };
}

const deliveryRow = {
  advertiserAccountId: null,
  advertiserLabel: "Marca parceira",
  archivedAt: null,
  audience: "ALL" as const,
  body: "Conteúdo seguro.",
  creativeAssetId: "40000000-0000-4000-8000-000000000001",
  creativeAssetMobileId: null,
  creativeAssetTabletId: null,
  creatorAccountArchivedAt: null,
  creatorAccountRole: null,
  creatorAccountStatus: null,
  creatorAvatarAssetId: null,
  creatorCompletionPercentage: null,
  creatorDisplayName: null,
  creatorProfileArchivedAt: null,
  creatorProfileId: null,
  endsAt: new Date("2026-09-01T00:00:00.000Z"),
  featuredCreatorProfileId: null,
  id: "50000000-0000-4000-8000-000000000001",
  isActive: true,
  linkLabel: "Conhecer",
  linkUrl: "https://example.test/campanha",
  mediaArchivedAt: null,
  mediaBucketName: "sponsorship-media",
  mediaId: "40000000-0000-4000-8000-000000000001",
  mediaKind: "SPONSORSHIP_CREATIVE" as const,
  mediaMobileArchivedAt: null,
  mediaMobileBucketName: null,
  mediaMobileId: null,
  mediaMobileKind: null,
  mediaMobileOwnerAccountRole: null,
  mediaMobileStatus: null,
  mediaOwnerAccountRole: "ADMIN" as const,
  mediaStatus: "ACTIVE" as const,
  mediaTabletArchivedAt: null,
  mediaTabletBucketName: null,
  mediaTabletId: null,
  mediaTabletKind: null,
  mediaTabletOwnerAccountRole: null,
  mediaTabletStatus: null,
  placementType: "TOP_BANNER" as const,
  slotKey: "landing-top",
  sortOrder: 10,
  startsAt: new Date("2026-07-01T00:00:00.000Z"),
  title: "Conteúdo patrocinado",
};

const publicQuery = {
  allowedPlacementTypes: ["TOP_BANNER"] as const,
  limit: 5,
  now: new Date("2026-08-01T00:00:00.000Z"),
  route: "PUBLIC_LANDING" as const,
  slotKey: "landing-top",
  viewer: "PUBLIC" as const,
};

describe("Drizzle sponsorship delivery repository", () => {
  it("maps only delivery evidence and keeps storage paths out of candidates", async () => {
    const { database, query } = createQueryDatabase([deliveryRow]);
    const repository = createDrizzleSponsorshipDeliveryRepository(database);

    const candidates = await repository.listCandidates(publicQuery);

    expect(candidates).toEqual([
      {
        featuredCreator: null,
        featuredPresentation: null,
        media: {
          archivedAt: null,
          bucketName: "sponsorship-media",
          id: deliveryRow.mediaId,
          kind: "SPONSORSHIP_CREATIVE",
          ownerAccountRole: "ADMIN",
          status: "ACTIVE",
        },
        mediaMobile: null,
        mediaTablet: null,
        placement: {
          advertiserAccountId: null,
          advertiserLabel: "Marca parceira",
          archivedAt: null,
          audience: "ALL",
          body: "Conteúdo seguro.",
          creativeAssetId: deliveryRow.creativeAssetId,
          creativeAssetMobileId: null,
          creativeAssetTabletId: null,
          endsAt: deliveryRow.endsAt,
          featuredCreatorProfileId: null,
          id: deliveryRow.id,
          isActive: true,
          linkLabel: "Conhecer",
          linkUrl: "https://example.test/campanha",
          placementType: "TOP_BANNER",
          slotKey: "landing-top",
          sortOrder: 10,
          startsAt: deliveryRow.startsAt,
          title: "Conteúdo patrocinado",
        },
      },
    ]);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(JSON.stringify(candidates)).not.toMatch(/objectPath|signedUrl/iu);
  });

  it("does not query when route and requested types cannot intersect", async () => {
    const { database, select } = createQueryDatabase([]);
    const repository = createDrizzleSponsorshipDeliveryRepository(database);

    await expect(
      repository.listCandidates({
        ...publicQuery,
        allowedPlacementTypes: ["INLINE_BANNER"],
      }),
    ).resolves.toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  it("returns a private signing target only from the constrained lookup", async () => {
    const { database } = createQueryDatabase([
      {
        bucketName: "sponsorship-media",
        height: 720,
        objectPath: "admin/campaign.webp",
        width: 1_280,
      },
    ]);
    const repository = createDrizzleSponsorshipDeliveryRepository(database);

    await expect(
      repository.findSigningTarget({
        assetId: deliveryRow.mediaId,
        now: publicQuery.now,
        placementId: deliveryRow.id,
      }),
    ).resolves.toEqual({
      bucketName: "sponsorship-media",
      height: 720,
      objectPath: "admin/campaign.webp",
      width: 1_280,
    });
  });

  it("rejects an unexpected bucket even if the database adapter returns it", async () => {
    const { database } = createQueryDatabase([
      {
        bucketName: "unexpected-private-bucket",
        height: null,
        objectPath: "private/file.webp",
        width: null,
      },
    ]);
    const repository = createDrizzleSponsorshipDeliveryRepository(database);

    await expect(
      repository.findSigningTarget({
        assetId: deliveryRow.mediaId,
        now: publicQuery.now,
        placementId: deliveryRow.id,
      }),
    ).resolves.toBeNull();
  });
});
