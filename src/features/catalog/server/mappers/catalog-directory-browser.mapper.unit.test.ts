import { describe, expect, it, vi } from "vitest";

import type { DirectoryPageDto } from "../../types/catalog-directory.types";
import { toDirectoryBrowserPage } from "./catalog-directory-browser.mapper";

const page: DirectoryPageDto = {
  facets: {
    cities: ["São Paulo"],
    niches: [],
    segments: ["Moda"],
    states: ["SP"],
  },
  items: [
    {
      city: "São Paulo",
      companyId: "30000000-0000-4000-8000-000000000001",
      createdAt: "2026-08-01T12:00:00.000Z",
      description: "Marca de moda sustentável.",
      displayName: "Marca Exemplo",
      kind: "COMPANY",
      logoAssetId: "30000000-0000-4000-8000-000000000002",
      segment: "Moda",
      state: "SP",
      websiteUrl: "https://marca.example/",
    },
    {
      avatarAssetId: "30000000-0000-4000-8000-000000000003",
      bioExcerpt: "Conteúdo sobre moda e beleza.",
      city: "São Paulo",
      coverAssetId: null,
      createdAt: "2026-08-02T12:00:00.000Z",
      creatorId: "30000000-0000-4000-8000-000000000004",
      creatorType: "INFLUENCER",
      displayName: "Ana Creator",
      kind: "CREATOR",
      metrics: [],
      niches: [{ name: "Moda", slug: "moda" }],
      socialPlatforms: ["INSTAGRAM"],
      state: "SP",
      whatsappContactCount: 2,
    },
  ],
  nextCursor: "next-page",
  pageSize: 20,
};

describe("catalog directory browser mapper", () => {
  it("exchanges server asset references for signed browser media on both kinds", async () => {
    const resolveImage = vi.fn().mockResolvedValue({
      height: 640,
      url: "http://127.0.0.1:54321/storage/v1/object/sign/media/asset.png?token=signed",
      width: 640,
    });

    const result = await toDirectoryBrowserPage(page, resolveImage);

    expect(resolveImage).toHaveBeenCalledWith(
      "30000000-0000-4000-8000-000000000002",
    );
    expect(resolveImage).toHaveBeenCalledWith(
      "30000000-0000-4000-8000-000000000003",
    );
    expect(result.items[0]).toMatchObject({
      kind: "COMPANY",
      logo: { height: 640, width: 640 },
    });
    expect(result.items[1]).toMatchObject({
      avatar: { height: 640, width: 640 },
      cover: null,
      kind: "CREATOR",
    });
    expect(JSON.stringify(result)).not.toContain("AssetId");
  });

  it("keeps entries usable when a signed image is unavailable", async () => {
    const result = await toDirectoryBrowserPage(
      page,
      vi.fn().mockRejectedValue(new Error("storage unavailable")),
    );

    expect(result.items[0]).toMatchObject({ logo: null });
    expect(result.items[1]).toMatchObject({ avatar: null, cover: null });
    expect(result.items).toHaveLength(2);
  });

  it("passes the facets through untouched", async () => {
    const result = await toDirectoryBrowserPage(page, vi.fn());

    expect(result.facets).toEqual(page.facets);
  });
});
