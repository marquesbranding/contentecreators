import { describe, expect, it, vi } from "vitest";

import type { CatalogCreatorDetailDto } from "../../types/catalog-detail.types";
import { createCatalogDetailViewService } from "./catalog-detail-view.service";

const creatorId = "10000000-0000-4000-8000-000000000001";
const avatarAssetId = "20000000-0000-4000-8000-000000000001";

const detail: CatalogCreatorDetailDto = {
  bio: "Conteúdo sobre moda.",
  contact: { reason: "VIEWER_NOT_COMPANY", status: "UNAVAILABLE" },
  creatorId,
  creatorType: "UGC",
  displayName: "Creator Teste",
  location: { city: "Recife", state: "PE" },
  media: {
    avatar: { assetId: avatarAssetId, kind: "AVATAR" },
    cover: null,
  },
  metrics: [],
  niches: [{ name: "Moda", slug: "moda" }],
  socialProfiles: [],
};

const signedMedia = {
  expiresAt: "2026-07-28T18:00:00.000Z",
  height: 800,
  mimeType: "image/webp",
  url: "https://storage.example.test/signed-avatar",
  width: 800,
} as const;

describe("catalog detail view service", () => {
  it("resolves only eligible DTO media into a minimal short-lived view DTO", async () => {
    const loadDetail = vi.fn(async () => detail);
    const getSignedMedia = vi.fn(async () => signedMedia);
    const service = createCatalogDetailViewService({
      getSignedMedia,
      loadDetail,
    });

    const result = await service.load({
      creatorId,
      requestId: "catalog-detail-view-request",
    });

    expect(loadDetail).toHaveBeenCalledWith({
      creatorId,
      requestId: "catalog-detail-view-request",
    });
    expect(getSignedMedia).toHaveBeenCalledWith(avatarAssetId);
    expect(result?.media.avatar).toEqual({
      alt: "Foto de perfil de Creator Teste",
      expiresAt: signedMedia.expiresAt,
      height: 800,
      mimeType: "image/webp",
      url: signedMedia.url,
      width: 800,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /assetId|bucketName|objectPath|operationalEmail/iu,
    );
  });

  it("does not sign anything when eligibility was lost", async () => {
    const getSignedMedia = vi.fn(async () => signedMedia);
    const service = createCatalogDetailViewService({
      getSignedMedia,
      loadDetail: vi.fn(async () => null),
    });

    await expect(
      service.load({
        creatorId,
        requestId: "catalog-detail-missing-request",
      }),
    ).resolves.toBeNull();
    expect(getSignedMedia).not.toHaveBeenCalled();
  });

  it("omits media that can no longer be authorized or signed", async () => {
    const service = createCatalogDetailViewService({
      getSignedMedia: vi.fn(async () => null),
      loadDetail: vi.fn(async () => detail),
    });

    const result = await service.load({
      creatorId,
      requestId: "catalog-detail-expired-media",
    });

    expect(result?.media.avatar).toBeNull();
  });
});
