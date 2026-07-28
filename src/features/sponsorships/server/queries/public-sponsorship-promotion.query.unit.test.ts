import { describe, expect, it, vi } from "vitest";

import type {
  RendererPlacementDto,
  SponsorshipPlacementCandidate,
} from "../../types/sponsorship-placement.types";
import type {
  SponsorshipDeliveryCandidateRecord,
  SponsorshipDeliveryRepository,
} from "../repositories/sponsorship-delivery.repository";
import { createSponsorshipDeliveryService } from "../services/sponsorship-delivery.service";
import { loadPublicSponsorshipPromotion } from "./public-sponsorship-promotion.query";

const now = new Date("2026-08-01T12:00:00.000Z");
const assetId = "40000000-0000-4000-8000-000000000001";
const placementId = "50000000-0000-4000-8000-000000000001";
const promotion: RendererPlacementDto = {
  body: "Uma oportunidade preparada para você.",
  eligible: true,
  featuredCreator: null,
  id: placementId,
  linkLabel: "Conhecer",
  linkUrl: "https://example.test/promocao",
  media: {
    alt: "Campanha promocional",
    url: "https://storage.example.test/signed-promotion",
  },
  sortOrder: 10,
  title: "Conteúdo patrocinado",
  type: "TOP_BANNER",
};

const genericPlacement: SponsorshipPlacementCandidate = {
  advertiserAccountId: null,
  advertiserLabel: "Marca externa",
  archivedAt: null,
  audience: "ALL",
  body: promotion.body,
  creativeAssetId: assetId,
  endsAt: new Date("2026-09-01T00:00:00.000Z"),
  featuredCreatorProfileId: null,
  id: placementId,
  isActive: true,
  linkLabel: promotion.linkLabel,
  linkUrl: promotion.linkUrl,
  placementType: "TOP_BANNER",
  slotKey: "landing-top",
  sortOrder: 10,
  startsAt: new Date("2026-07-01T00:00:00.000Z"),
  title: promotion.title,
};

function deliveryRepository(
  placement: SponsorshipPlacementCandidate,
): SponsorshipDeliveryRepository {
  const candidate: SponsorshipDeliveryCandidateRecord = {
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
    placement,
  };

  return {
    listCandidates: vi.fn(async () => [candidate]),
  };
}

describe("public sponsorship promotion query", () => {
  it("uses only the fixed generic public landing delivery contract", async () => {
    const load = vi.fn(async () => [promotion]);

    await expect(
      loadPublicSponsorshipPromotion({ delivery: { load }, now }),
    ).resolves.toEqual(promotion);
    expect(load).toHaveBeenCalledExactlyOnceWith({
      allowedPlacementTypes: ["TOP_BANNER"],
      limit: 1,
      now,
      route: "PUBLIC_LANDING",
      slotKey: "landing-top",
      viewer: "PUBLIC",
    });
  });

  it.each([
    {
      name: "featured creator",
      unsafe: {
        ...promotion,
        featuredCreator: {
          avatar: null,
          creatorId: "70000000-0000-4000-8000-000000000001",
          displayName: "Participante protegida",
        },
        type: "FEATURED_CREATOR" as const,
      },
    },
    {
      name: "profile-bearing top banner",
      unsafe: {
        ...promotion,
        featuredCreator: {
          avatar: null,
          creatorId: "70000000-0000-4000-8000-000000000001",
          displayName: "Participante protegida",
        },
      },
    },
    {
      name: "banner without private signed creative",
      unsafe: { ...promotion, media: null },
    },
  ])("fails closed for a mocked $name DTO", async ({ unsafe }) => {
    await expect(
      loadPublicSponsorshipPromotion({
        delivery: { load: vi.fn(async () => [unsafe]) },
        now,
      }),
    ).resolves.toBeNull();
  });

  it.each([
    {
      label: "advertiser account reference",
      placement: {
        ...genericPlacement,
        advertiserAccountId: "60000000-0000-4000-8000-000000000001",
      },
    },
    {
      label: "protected profile reference",
      placement: {
        ...genericPlacement,
        featuredCreatorProfileId: "70000000-0000-4000-8000-000000000001",
      },
    },
  ])(
    "does not sign or return a placement with $label",
    async ({ placement }) => {
      const resolveSignedMedia = vi.fn(async () => ({
        height: 720,
        url: "https://storage.example.test/signed-promotion",
        width: 1_280,
      }));
      const delivery = createSponsorshipDeliveryService({
        repository: deliveryRepository(placement),
        resolveSignedMedia,
      });

      await expect(
        loadPublicSponsorshipPromotion({ delivery, now }),
      ).resolves.toBeNull();
      expect(resolveSignedMedia).not.toHaveBeenCalled();
    },
  );

  it("renders no state when delivery is absent or unavailable", async () => {
    await expect(
      loadPublicSponsorshipPromotion({
        delivery: { load: vi.fn(async () => []) },
        now,
      }),
    ).resolves.toBeNull();
    await expect(
      loadPublicSponsorshipPromotion({
        delivery: {
          load: vi.fn(async () => {
            throw new Error("private infrastructure detail");
          }),
        },
        now,
      }),
    ).resolves.toBeNull();
  });
});
