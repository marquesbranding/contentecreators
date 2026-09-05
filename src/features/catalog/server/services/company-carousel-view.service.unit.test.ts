import { describe, expect, it, vi } from "vitest";

import type { CompanyCarouselResponseDto } from "../../types/company-carousel.types";
import { createCompanyCarouselViewService } from "./company-carousel-view.service";

const assetId = "30000000-0000-4000-8000-000000000001";
const source: CompanyCarouselResponseDto = {
  facets: { segments: ["Moda"] },
  items: [
    {
      city: "Joaçaba",
      companyId: "20000000-0000-4000-8000-000000000002",
      description: "Marca aberta a parcerias com creators locais.",
      displayName: "Marca Exemplo",
      email: "contato@marca.example",
      logo: { alt: "Logo da Marca Exemplo", assetId },
      segment: "Moda",
      state: "SC",
      websiteUrl: "https://marca.example/",
      whatsappE164: "+5549999999999",
    },
  ],
  limit: 12,
};
const signedMedia = {
  expiresAt: "2026-07-28T18:00:00.000Z",
  height: 400,
  mimeType: "image/png",
  url: "https://storage.example.test/signed-logo",
  width: 800,
} as const;

describe("company carousel view service", () => {
  it("returns only companies whose private logo can be signed", async () => {
    const listCompanies = vi.fn(async () => source);
    const getSignedMedia = vi.fn(async () => signedMedia);
    const service = createCompanyCarouselViewService({
      getSignedMedia,
      listCompanies,
    });

    const result = await service.list(
      { limit: 12 },
      "company-carousel-view-request",
    );

    expect(listCompanies).toHaveBeenCalledWith(
      { limit: 12 },
      "company-carousel-view-request",
    );
    expect(getSignedMedia).toHaveBeenCalledWith(assetId);
    expect(result).toEqual({
      facets: { segments: ["Moda"] },
      items: [
        {
          city: "Joaçaba",
          companyId: "20000000-0000-4000-8000-000000000002",
          description: "Marca aberta a parcerias com creators locais.",
          displayName: "Marca Exemplo",
          email: "contato@marca.example",
          logo: {
            alt: "Logo da Marca Exemplo",
            expiresAt: signedMedia.expiresAt,
            height: 400,
            mimeType: "image/png",
            url: signedMedia.url,
            width: 800,
          },
          segment: "Moda",
          state: "SC",
          websiteUrl: "https://marca.example/",
          whatsappE164: "+5549999999999",
        },
      ],
      limit: 12,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /assetId|bucketName|objectPath|cnpj|legalName/iu,
    );
  });

  it("suppresses entries only after an existing logo authorization is lost", async () => {
    const service = createCompanyCarouselViewService({
      getSignedMedia: vi.fn(async () => null),
      listCompanies: vi.fn(async () => source),
    });

    await expect(
      service.list({}, "company-carousel-logo-missing"),
    ).resolves.toEqual({
      facets: { segments: ["Moda"] },
      items: [],
      limit: 12,
    });
  });

  it("keeps approved companies without a logo", async () => {
    const service = createCompanyCarouselViewService({
      getSignedMedia: vi.fn(),
      listCompanies: vi.fn(async () => ({
        ...source,
        items: [{ ...source.items[0]!, logo: null }],
      })),
    });

    await expect(
      service.list({}, "company-carousel-logo-optional"),
    ).resolves.toMatchObject({
      items: [{ displayName: "Marca Exemplo", logo: null }],
      limit: 12,
    });
  });
});
