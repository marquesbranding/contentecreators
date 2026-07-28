import { describe, expect, it, vi } from "vitest";

import type { CreatorCatalogPageDto } from "../../types/creator-catalog.types";
import { toCreatorCatalogBrowserPage } from "./creator-catalog-browser.mapper";

const page: CreatorCatalogPageDto = {
  items: [
    {
      avatarAssetId: "30000000-0000-4000-8000-000000000003",
      bioExcerpt: "Conteúdo sobre moda e beleza.",
      city: "São Paulo",
      creatorId: "30000000-0000-4000-8000-000000000004",
      creatorType: "INFLUENCER",
      displayName: "Ana Creator",
      niches: [{ name: "Moda", slug: "moda" }],
      socialPlatforms: ["INSTAGRAM"],
      state: "SP",
    },
    {
      avatarAssetId: null,
      bioExcerpt: null,
      city: null,
      creatorId: "30000000-0000-4000-8000-000000000005",
      creatorType: "UGC",
      displayName: "Bia UGC",
      niches: [],
      socialPlatforms: [],
      state: null,
    },
  ],
  nextCursor: "next-page",
  pageSize: 20,
};

describe("creator catalog browser mapper", () => {
  it("exchanges server asset references for signed browser media", async () => {
    const resolveImage = vi.fn().mockResolvedValue({
      height: 640,
      url: "http://127.0.0.1:54321/storage/v1/object/sign/media/avatar.png?token=signed",
      width: 640,
    });

    const result = await toCreatorCatalogBrowserPage(page, resolveImage);

    expect(resolveImage).toHaveBeenCalledWith(
      "30000000-0000-4000-8000-000000000003",
    );
    expect(result.items[0]?.avatar).toEqual({
      height: 640,
      url: "http://127.0.0.1:54321/storage/v1/object/sign/media/avatar.png?token=signed",
      width: 640,
    });
    expect(result.items[1]?.avatar).toBeNull();
    expect(JSON.stringify(result)).not.toContain("avatarAssetId");
  });

  it("keeps the catalog usable when one signed image is unavailable", async () => {
    const result = await toCreatorCatalogBrowserPage(
      page,
      vi.fn().mockRejectedValue(new Error("storage unavailable")),
    );

    expect(result.items[0]?.avatar).toBeNull();
    expect(result.items).toHaveLength(2);
  });
});
