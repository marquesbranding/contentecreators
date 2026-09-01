import { describe, expect, it } from "vitest";

import { catalogCreatorDetailViewSchema } from "./catalog-detail-view.schema";
import { companyCarouselViewResponseSchema } from "./company-carousel-view.schema";

const signedMedia = {
  alt: "Foto de perfil",
  expiresAt: "2026-07-28T18:00:00.000Z",
  height: 800,
  mimeType: "image/webp",
  url: "https://storage.example.test/signed-object?token=short-lived",
  width: 800,
} as const;

const detail = {
  bio: "Conteúdo.",
  contact: { reason: "VIEWER_NOT_COMPANY", status: "UNAVAILABLE" },
  creatorId: "10000000-0000-4000-8000-000000000001",
  creatorType: "INFLUENCER",
  displayName: "Creator",
  location: { city: "Recife", state: "PE" },
  media: { avatar: signedMedia, cover: null },
  metrics: [],
  niches: [],
  socialProfiles: [],
  whatsappContactCount: 0,
} as const;

describe("private catalog view schemas", () => {
  it("accepts only the minimal signed-media DTO", () => {
    expect(catalogCreatorDetailViewSchema.parse(detail)).toEqual(detail);
    expect(() =>
      catalogCreatorDetailViewSchema.parse({
        ...detail,
        media: {
          avatar: {
            ...signedMedia,
            assetId: "20000000-0000-4000-8000-000000000001",
            objectPath: "private/path.webp",
          },
          cover: null,
        },
      }),
    ).toThrow();
  });

  it("rejects company links containing embedded credentials", () => {
    expect(() =>
      companyCarouselViewResponseSchema.parse({
        items: [
          {
            displayName: "Marca",
            logo: signedMedia,
            websiteUrl: "https://user:password@marca.example/",
          },
        ],
        limit: 12,
      }),
    ).toThrow();
  });
});
