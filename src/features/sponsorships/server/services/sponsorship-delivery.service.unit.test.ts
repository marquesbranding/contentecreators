import { describe, expect, it, vi } from "vitest";

import type {
  SponsorshipDeliveryCandidateRecord,
  SponsorshipDeliveryRepository,
} from "../repositories/sponsorship-delivery.repository";
import { createSponsorshipDeliveryService } from "./sponsorship-delivery.service";

const assetId = "40000000-0000-4000-8000-000000000001";

const genericCandidate: SponsorshipDeliveryCandidateRecord = {
  featuredCreator: null,
  featuredPresentation: null,
  media: {
    archivedAt: null,
    bucketName: "sponsorship-media",
    id: assetId,
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
    audience: "COMPANY",
    body: "Uma oportunidade para sua marca.",
    creativeAssetId: assetId,
    creativeAssetMobileId: null,
    creativeAssetTabletId: null,
    endsAt: new Date("2026-08-31T23:59:59.000Z"),
    featuredCreatorProfileId: null,
    id: "50000000-0000-4000-8000-000000000001",
    isActive: true,
    linkLabel: "Conhecer",
    linkUrl: "https://example.test/campanha",
    placementType: "INLINE_BANNER",
    slotKey: "catalog-inline",
    sortOrder: 20,
    startsAt: new Date("2026-08-01T00:00:00.000Z"),
    title: "Conteúdo patrocinado",
  },
};

function repository(
  candidates: SponsorshipDeliveryCandidateRecord[],
): SponsorshipDeliveryRepository {
  return {
    listCandidates: vi.fn(async () => candidates),
  };
}

const query = {
  allowedPlacementTypes: ["INLINE_BANNER"] as const,
  limit: 10,
  now: new Date("2026-08-15T12:00:00.000Z"),
  route: "CATALOG" as const,
  slotKey: "catalog-inline",
  viewer: "APPROVED_COMPANY" as const,
};

describe("sponsorship delivery service", () => {
  it("maps eligible placements to a minimal signed renderer DTO", async () => {
    const resolveSignedMedia = vi.fn(async () => ({
      height: 600,
      url: "https://storage.example.test/signed-creative",
      width: 1200,
    }));
    const service = createSponsorshipDeliveryService({
      repository: repository([genericCandidate]),
      resolveSignedMedia,
    });

    const result = await service.load(query);

    expect(result).toEqual([
      {
        body: "Uma oportunidade para sua marca.",
        eligible: true,
        featuredCreator: null,
        id: genericCandidate.placement.id,
        linkLabel: "Conhecer",
        linkUrl: "https://example.test/campanha",
        media: {
          alt: "Conteúdo patrocinado — Marca parceira",
          url: "https://storage.example.test/signed-creative",
        },
        mediaMobile: null,
        mediaTablet: null,
        sortOrder: 20,
        title: "Conteúdo patrocinado",
        type: "INLINE_BANNER",
      },
    ]);
    expect(resolveSignedMedia).toHaveBeenCalledWith(
      assetId,
      genericCandidate.placement.id,
      query.now,
    );
    expect(JSON.stringify(result)).not.toMatch(
      /assetId|bucketName|objectPath|ownerAccount/iu,
    );
  });

  it("suppresses participant-derived public placements while social proof is disabled", async () => {
    const resolveSignedMedia = vi.fn();
    const service = createSponsorshipDeliveryService({
      repository: repository([
        {
          ...genericCandidate,
          placement: {
            ...genericCandidate.placement,
            advertiserAccountId: "60000000-0000-4000-8000-000000000001",
            audience: "ALL",
            placementType: "TOP_BANNER",
            slotKey: "landing-top",
          },
        },
      ]),
      resolveSignedMedia,
    });

    await expect(
      service.load({
        ...query,
        allowedPlacementTypes: ["TOP_BANNER"],
        route: "PUBLIC_LANDING",
        slotKey: "landing-top",
        viewer: "PUBLIC",
      }),
    ).resolves.toEqual([]);
    expect(resolveSignedMedia).not.toHaveBeenCalled();
  });

  it("suppresses stale featured creators and unsigned required media", async () => {
    const featuredProfileId = "70000000-0000-4000-8000-000000000001";
    const featured: SponsorshipDeliveryCandidateRecord = {
      featuredCreator: {
        accountArchivedAt: null,
        accountStatus: "BANNED",
        completionPercentage: 100,
        profileArchivedAt: null,
        profileId: featuredProfileId,
      },
      featuredPresentation: {
        avatarAssetId: null,
        displayName: "Creator indisponível",
      },
      media: null,
      mediaMobile: null,
      mediaTablet: null,
      placement: {
        ...genericCandidate.placement,
        creativeAssetId: null,
        featuredCreatorProfileId: featuredProfileId,
        placementType: "FEATURED_CREATOR",
        slotKey: "catalog-featured",
      },
    };
    const service = createSponsorshipDeliveryService({
      repository: repository([featured, genericCandidate]),
      resolveSignedMedia: vi.fn(async () => null),
    });

    await expect(
      service.load({
        ...query,
        allowedPlacementTypes: ["FEATURED_CREATOR", "INLINE_BANNER"],
      }),
    ).resolves.toEqual([]);
  });

  it("binds a featured creator avatar signature to its eligible placement", async () => {
    const featuredProfileId = "70000000-0000-4000-8000-000000000001";
    const avatarAssetId = "80000000-0000-4000-8000-000000000001";
    const featured: SponsorshipDeliveryCandidateRecord = {
      featuredCreator: {
        accountArchivedAt: null,
        accountStatus: "APPROVED",
        completionPercentage: 100,
        profileArchivedAt: null,
        profileId: featuredProfileId,
      },
      featuredPresentation: {
        avatarAssetId,
        displayName: "Creator aprovada",
      },
      media: null,
      mediaMobile: null,
      mediaTablet: null,
      placement: {
        ...genericCandidate.placement,
        creativeAssetId: null,
        featuredCreatorProfileId: featuredProfileId,
        id: "50000000-0000-4000-8000-000000000004",
        placementType: "FEATURED_CREATOR",
        slotKey: "catalog-featured",
      },
    };
    const resolveSignedMedia = vi.fn(async () => ({
      height: 400,
      url: "https://storage.example.test/signed-avatar",
      width: 400,
    }));
    const service = createSponsorshipDeliveryService({
      repository: repository([featured]),
      resolveSignedMedia,
    });
    const result = await service.load({
      ...query,
      allowedPlacementTypes: ["FEATURED_CREATOR"],
      slotKey: "catalog-featured",
    });

    expect(resolveSignedMedia).toHaveBeenCalledWith(
      avatarAssetId,
      featured.placement.id,
      query.now,
    );
    expect(result).toEqual([
      expect.objectContaining({
        featuredCreator: {
          avatar: {
            alt: "Foto de perfil de Creator aprovada",
            url: "https://storage.example.test/signed-avatar",
          },
          creatorId: featuredProfileId,
          displayName: "Creator aprovada",
        },
        id: featured.placement.id,
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain(avatarAssetId);
  });

  it("uses deterministic sort order followed by placement id", async () => {
    const service = createSponsorshipDeliveryService({
      repository: repository([
        {
          ...genericCandidate,
          placement: {
            ...genericCandidate.placement,
            id: "50000000-0000-4000-8000-000000000003",
            sortOrder: 1,
          },
        },
        {
          ...genericCandidate,
          placement: {
            ...genericCandidate.placement,
            id: "50000000-0000-4000-8000-000000000002",
            sortOrder: 1,
          },
        },
      ]),
      resolveSignedMedia: vi.fn(async () => ({
        height: null,
        url: "https://storage.example.test/signed",
        width: null,
      })),
    });

    const result = await service.load(query);

    expect(result.map(({ id }) => id)).toEqual([
      "50000000-0000-4000-8000-000000000002",
      "50000000-0000-4000-8000-000000000003",
    ]);
  });
});
