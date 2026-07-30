import { describe, expect, it, vi } from "vitest";

import { fetchPublicSponsorshipPromotion } from "./public-sponsorship-promotion.api";

const promotion = {
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

describe("public sponsorship promotion API", () => {
  it("accepts a generic public promotion without credentials", async () => {
    const request = vi.fn(async () => ({
      json: async () => promotion,
      ok: true,
    }));
    const controller = new AbortController();

    await expect(
      fetchPublicSponsorshipPromotion(controller.signal, request),
    ).resolves.toEqual(promotion);
    expect(request).toHaveBeenCalledWith(
      "/api/public/sponsorships/landing",
      expect.objectContaining({
        credentials: "omit",
        signal: controller.signal,
      }),
    );
  });

  it.each([
    ["transport failure", vi.fn().mockRejectedValue(new Error("offline"))],
    [
      "participant-derived payload",
      vi.fn(async () => ({
        json: async () => ({
          ...promotion,
          featuredCreator: {
            avatar: null,
            creatorId: "70000000-0000-4000-8000-000000000001",
            displayName: "Participante privado",
          },
        }),
        ok: true,
      })),
    ],
    [
      "non-success response",
      vi.fn(async () => ({ json: async () => null, ok: false })),
    ],
  ])("fails closed for %s", async (_case, request) => {
    await expect(
      fetchPublicSponsorshipPromotion(new AbortController().signal, request),
    ).resolves.toBeNull();
  });
});
