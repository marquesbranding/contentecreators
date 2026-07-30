import { describe, expect, it, vi } from "vitest";

import type { RendererPlacementDto } from "../../types/sponsorship-placement.types";
import { createPublicSponsorshipPromotionRouteHandler } from "./public-sponsorship-promotion.handler";

const promotion: RendererPlacementDto = {
  body: "Uma oportunidade para a comunidade.",
  eligible: true,
  featuredCreator: null,
  id: "50000000-0000-4000-8000-000000000001",
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

describe("public sponsorship promotion Route Handler", () => {
  it("returns a short-lived cacheable generic promotion", async () => {
    const handler = createPublicSponsorshipPromotionRouteHandler({
      load: vi.fn(async () => promotion),
    });

    const response = await handler();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    await expect(response.json()).resolves.toEqual(promotion);
  });

  it("isolates an unavailable dependency behind an empty no-store response", async () => {
    const handler = createPublicSponsorshipPromotionRouteHandler({
      load: vi.fn().mockRejectedValue(new Error("storage unavailable")),
    });

    const response = await handler();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toBeNull();
  });
});
