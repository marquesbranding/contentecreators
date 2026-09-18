import { describe, expect, expectTypeOf, it } from "vitest";

import type { SponsorshipPlacementDraft } from "../types/sponsorship-placement.types";
import {
  sponsorshipPlacementActivationSchema,
  sponsorshipPlacementDraftSchema,
} from "./sponsorship-placement.schema";

const validPlacement = {
  advertiserAccountId: null,
  advertiserLabel: "Marca parceira",
  audience: "ALL",
  body: null,
  creativeAssetId: "10000000-0000-4000-8000-000000000001",
  endsAt: "2026-08-31T23:59:59.000Z",
  featuredCreatorProfileId: null,
  isActive: true,
  linkLabel: "Conheça",
  linkUrl: "https://example.test/campanha",
  placementType: "TOP_BANNER",
  slotKey: "landing-top",
  sortOrder: 0,
  startsAt: "2026-08-01T00:00:00.000Z",
  title: "Conteúdo em destaque",
} as const;

describe("sponsorship placement schemas", () => {
  it.each([
    "TOP_BANNER",
    "INLINE_BANNER",
    "CAROUSEL",
    "FEATURED_CREATOR",
  ] as const)("accepts the supported placement type %s", (placementType) => {
    expect(
      sponsorshipPlacementDraftSchema.safeParse({
        ...validPlacement,
        placementType,
      }).success,
    ).toBe(true);
  });

  it("allows an incomplete draft but prevents its activation", () => {
    const incomplete = {
      audience: "ALL",
      isActive: false,
      placementType: "INLINE_BANNER",
      slotKey: "catalog-inline",
      sortOrder: 1,
    };

    expect(sponsorshipPlacementDraftSchema.safeParse(incomplete).success).toBe(
      true,
    );
    expect(
      sponsorshipPlacementActivationSchema.safeParse({
        ...incomplete,
        isActive: true,
      }),
    ).toMatchObject({
      error: expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            message: "Selecione uma mídia privada válida antes de ativar.",
          }),
        ]),
      }),
      success: false,
    });
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "ftp://example.test/banner",
    "https://user:password@example.test/private",
  ])("rejects the unsafe creative URL %s", (linkUrl) => {
    expect(
      sponsorshipPlacementDraftSchema.safeParse({
        ...validPlacement,
        linkUrl,
      }).success,
    ).toBe(false);
  });

  it.each(["http://localhost:3000/campanha", "https://example.test/campanha"])(
    "accepts safe HTTP(S) URL %s",
    (linkUrl) => {
      expect(
        sponsorshipPlacementDraftSchema.safeParse({
          ...validPlacement,
          linkUrl,
        }).success,
      ).toBe(true);
    },
  );

  it("requires an end instant later than its start instant", () => {
    expect(
      sponsorshipPlacementDraftSchema.safeParse({
        ...validPlacement,
        endsAt: validPlacement.startsAt,
      }),
    ).toMatchObject({
      error: expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            message: "A data final deve ser posterior à data inicial.",
          }),
        ]),
      }),
      success: false,
    });
  });

  it("rejects a timestamp without an explicit UTC offset", () => {
    expect(
      sponsorshipPlacementDraftSchema.safeParse({
        ...validPlacement,
        startsAt: "2026-08-01T00:00:00",
      }).success,
    ).toBe(false);
  });

  it.each([
    "price",
    "payment",
    "invoice",
    "commission",
    "split",
    "escrow",
    "checkout",
    "renewal",
  ])("strictly rejects the financial field %s", (field) => {
    expect(
      sponsorshipPlacementDraftSchema.safeParse({
        ...validPlacement,
        [field]: 100,
      }).success,
    ).toBe(false);
  });

  it("keeps the domain draft type free of financial semantics", () => {
    expectTypeOf<SponsorshipPlacementDraft>().not.toHaveProperty("price");
    expectTypeOf<SponsorshipPlacementDraft>().not.toHaveProperty("payment");
    expectTypeOf<SponsorshipPlacementDraft>().not.toHaveProperty("invoice");
    expectTypeOf<SponsorshipPlacementDraft>().not.toHaveProperty("commission");
    expectTypeOf<SponsorshipPlacementDraft>().not.toHaveProperty("split");
    expectTypeOf<SponsorshipPlacementDraft>().not.toHaveProperty("renewal");
  });
});

it.each([
  { linkUrl: null, linkLabel: null, linkOnCreative: false },
  { linkUrl: "https://example.com", linkLabel: null, linkOnCreative: false },
  { linkUrl: "https://example.com", linkLabel: null, linkOnCreative: true },
  {
    linkUrl: "https://example.com",
    linkLabel: "Conheça",
    linkOnCreative: false,
  },
  {
    linkUrl: "https://example.com",
    linkLabel: "Conheça",
    linkOnCreative: true,
  },
])(
  "activates image-only ads with optional independent click points: %j",
  (links) => {
    for (const slot of [
      "landing-top",
      "catalog-top",
      "catalog-inline",
      "catalog-midlist",
    ]) {
      const value = {
        ...validPlacement,
        ...links,
        slotKey: slot,
        title: null,
        body: null,
      };
      expect(sponsorshipPlacementDraftSchema.safeParse(value).success).toBe(
        true,
      );
      expect(
        sponsorshipPlacementActivationSchema.safeParse(value).success,
      ).toBe(true);
    }
  },
);
it.each([
  { linkOnCreative: true, linkUrl: null, linkLabel: null },
  { linkOnCreative: false, linkUrl: null, linkLabel: "Conheça" },
  { showAdvertiserLabel: true, advertiserLabel: null },
  { textColor: "red" },
  { buttonTextColor: "#fff" },
  { buttonBackgroundColor: "url(evil)" },
  { fontFamily: "Arial" },
])(
  "rejects invalid creative options for drafts and activation: %j",
  (options) => {
    expect(
      sponsorshipPlacementDraftSchema.safeParse({
        ...validPlacement,
        ...options,
      }).success,
    ).toBe(false);
    expect(
      sponsorshipPlacementActivationSchema.safeParse({
        ...validPlacement,
        ...options,
      }).success,
    ).toBe(false);
  },
);
