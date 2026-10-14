import { describe, expect, it, vi } from "vitest";

import { fetchPublicSponsorshipPromotions } from "./public-sponsorship-promotion.api";

const promotion = {
  linkOnCreative: false,
  showSponsoredBadge: true,
  showAdvertiserLabel: false,
  textColor: null,
  buttonBackgroundColor: null,
  buttonTextColor: null,
  fontFamily: null,
  imageAlt: null,

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

const second = {
  ...promotion,
  id: "50000000-0000-4000-8000-000000000002",
  sortOrder: 20,
  title: "Segundo banner",
};

describe("public sponsorship promotion API", () => {
  it("accepts a generic public promotion without credentials", async () => {
    const request = vi.fn(async () => ({
      json: async () => promotion,
      ok: true,
    }));
    const controller = new AbortController();

    await expect(
      fetchPublicSponsorshipPromotions(controller.signal, request),
    ).resolves.toEqual([promotion]);
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
      vi.fn(async () => ({ json: async () => [], ok: false })),
    ],
  ])("fails closed for %s", async (_case, request) => {
    await expect(
      fetchPublicSponsorshipPromotions(new AbortController().signal, request),
    ).resolves.toEqual([]);
  });

  it.each([
    ["a list", [promotion, second], [promotion, second]],
    ["a single legacy object", promotion, [promotion]],
    ["a legacy null", null, []],
    ["an empty list", [], []],
  ])("normalizes %s into a list", async (_case, payload, expected) => {
    const request = vi.fn(async () => ({
      json: async () => payload,
      ok: true,
    }));

    await expect(
      fetchPublicSponsorshipPromotions(new AbortController().signal, request),
    ).resolves.toEqual(expected);
  });

  it("drops only the invalid items of a list and keeps the order", async () => {
    const unsafe = { ...promotion, media: { alt: "x", url: "javascript:1" } };
    const request = vi.fn(async () => ({
      json: async () => [promotion, unsafe, second],
      ok: true,
    }));

    await expect(
      fetchPublicSponsorshipPromotions(new AbortController().signal, request),
    ).resolves.toEqual([promotion, second]);
  });

  it("never returns more banners than the landing slot accepts", async () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      ...promotion,
      id: `50000000-0000-4000-8000-00000000010${index}`,
      sortOrder: index,
    }));
    const request = vi.fn(async () => ({
      json: async () => many,
      ok: true,
    }));

    await expect(
      fetchPublicSponsorshipPromotions(new AbortController().signal, request),
    ).resolves.toHaveLength(5);
  });
});

describe("public sponsorship advertiser and responsive variants", () => {
  it("keeps the sponsor and validated mobile/tablet media in the renderer DTO", async () => {
    const value = {
      ...promotion,
      advertiserLabel: "Marca Aurora",
      mediaMobile: { alt: "Mobile", url: "https://example.com/mobile.png" },
      mediaTablet: null,
    };
    await expect(
      fetchPublicSponsorshipPromotions(
        new AbortController().signal,
        async () => ({ ok: true, json: async () => value }),
      ),
    ).resolves.toEqual([value]);
  });
  it("rejects an unsafe responsive media URL", async () => {
    await expect(
      fetchPublicSponsorshipPromotions(
        new AbortController().signal,
        async () => ({
          ok: true,
          json: async () => ({
            ...promotion,
            mediaMobile: { alt: "Invalid", url: "javascript:alert(1)" },
          }),
        }),
      ),
    ).resolves.toEqual([]);
  });
});

it("accepts image-only options and fails closed for injected appearance", async () => {
  const value = {
    ...promotion,
    title: null,
    body: null,
    linkLabel: null,
    linkOnCreative: true,
    textColor: "#111111",
    fontFamily: "serif",
    showSponsoredBadge: false,
    imageAlt: "Oferta na imagem",
  };
  const fetchValue = (data: unknown) =>
    fetchPublicSponsorshipPromotions(
      new AbortController().signal,
      async () => ({
        ok: true,
        json: async () => data,
      }),
    );
  await expect(fetchValue(value)).resolves.toMatchObject([value]);
  await expect(fetchValue({ ...value, textColor: "red" })).resolves.toEqual([]);
  await expect(
    fetchValue({ ...value, showSponsoredBadge: "false" }),
  ).resolves.toEqual([]);
  await expect(
    fetchValue({ ...value, fontFamily: "url(evil)" }),
  ).resolves.toEqual([]);
});
