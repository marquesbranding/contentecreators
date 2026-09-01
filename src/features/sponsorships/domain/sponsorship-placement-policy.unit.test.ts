import { describe, expect, it } from "vitest";

import type {
  PlacementEvaluationInput,
  SponsorshipPlacementCandidate,
} from "../types/sponsorship-placement.types";
import {
  evaluatePlacement,
  isPlacementEligible,
  sortEligiblePlacements,
  validatePlacementForActivation,
} from "./sponsorship-placement-policy";

const placementId = "20000000-0000-4000-8000-000000000002";
const creativeAssetId = "20000000-0000-4000-8000-000000000003";
const creatorProfileId = "20000000-0000-4000-8000-000000000004";

const placement: SponsorshipPlacementCandidate = {
  advertiserAccountId: null,
  advertiserLabel: "Marca parceira",
  archivedAt: null,
  audience: "ALL",
  body: null,
  creativeAssetId,
  creativeAssetMobileId: null,
  creativeAssetTabletId: null,
  endsAt: new Date("2026-08-31T23:59:59.000Z"),
  featuredCreatorProfileId: null,
  id: placementId,
  isActive: true,
  linkLabel: "Conheça",
  linkUrl: "https://example.test/campanha",
  placementType: "TOP_BANNER",
  slotKey: "landing-top",
  sortOrder: 10,
  startsAt: new Date("2026-08-01T00:00:00.000Z"),
  title: "Conteúdo em destaque",
};

const eligibleMedia = {
  archivedAt: null,
  bucketName: "sponsorship-media",
  id: creativeAssetId,
  kind: "SPONSORSHIP_CREATIVE",
  ownerAccountRole: "ADMIN",
  status: "ACTIVE",
} as const;

function evaluation(
  overrides: Partial<PlacementEvaluationInput> = {},
): PlacementEvaluationInput {
  return {
    allowedPlacementTypes: ["TOP_BANNER"],
    featuredCreator: null,
    media: eligibleMedia,
    mediaMobile: null,
    mediaTablet: null,
    now: new Date("2026-08-15T12:00:00.000Z"),
    placement,
    route: "PUBLIC_LANDING",
    slotKey: "landing-top",
    viewer: "PUBLIC",
    ...overrides,
  };
}

describe("sponsorship placement policy", () => {
  it("validates a complete inactive draft as ready for activation", () => {
    expect(
      validatePlacementForActivation({
        featuredCreator: null,
        media: eligibleMedia,
        mediaMobile: null,
        mediaTablet: null,
        placement: { ...placement, isActive: false },
      }),
    ).toEqual({ eligible: true, issues: [] });
  });

  it.each([
    new Date("2026-08-01T00:00:00.000Z"),
    new Date("2026-08-31T23:59:59.000Z"),
  ])("includes the inclusive schedule boundary %s", (now) => {
    expect(isPlacementEligible(evaluation({ now }))).toBe(true);
  });

  it.each([
    [new Date("2026-07-31T23:59:59.999Z"), "BEFORE_START"],
    [new Date("2026-09-01T00:00:00.000Z"), "AFTER_END"],
  ] as const)("suppresses time outside the UTC schedule", (now, issue) => {
    expect(evaluatePlacement(evaluation({ now }))).toMatchObject({
      eligible: false,
      issues: expect.arrayContaining([issue]),
    });
  });

  it.each([
    [{ isActive: false }, "INACTIVE"],
    [{ archivedAt: new Date("2026-08-10T00:00:00.000Z") }, "ARCHIVED"],
  ] as const)("suppresses inactive or archived placement", (patch, issue) => {
    expect(
      evaluatePlacement(evaluation({ placement: { ...placement, ...patch } })),
    ).toMatchObject({
      eligible: false,
      issues: expect.arrayContaining([issue]),
    });
  });

  it("requires the route, slot, accepted type and viewer audience to match", () => {
    const companyPlacement = {
      ...placement,
      audience: "COMPANY" as const,
      placementType: "INLINE_BANNER" as const,
      slotKey: "catalog-inline",
    };

    expect(
      evaluatePlacement(
        evaluation({
          allowedPlacementTypes: ["TOP_BANNER"],
          placement: companyPlacement,
          route: "CATALOG",
          slotKey: "catalog-top",
          viewer: "APPROVED_INFLUENCER",
        }),
      ).issues,
    ).toEqual(
      expect.arrayContaining([
        "AUDIENCE_MISMATCH",
        "SLOT_MISMATCH",
        "TYPE_MISMATCH",
      ]),
    );
  });

  it.each([
    ["ALL", "APPROVED_INFLUENCER"],
    ["ALL", "APPROVED_COMPANY"],
    ["INFLUENCER", "APPROVED_INFLUENCER"],
    ["COMPANY", "APPROVED_COMPANY"],
  ] as const)(
    "renders audience %s for viewer %s in the shared approved catalog",
    (audience, viewer) => {
      expect(
        isPlacementEligible(
          evaluation({
            placement: {
              ...placement,
              audience,
              slotKey: "catalog-top",
            },
            route: "CATALOG",
            slotKey: "catalog-top",
            viewer,
          }),
        ),
      ).toBe(true);
    },
  );

  it("suppresses a placement type that is incompatible with the public route", () => {
    expect(
      evaluatePlacement(
        evaluation({
          allowedPlacementTypes: ["INLINE_BANNER"],
          placement: {
            ...placement,
            placementType: "INLINE_BANNER",
          },
        }),
      ),
    ).toMatchObject({
      eligible: false,
      issues: expect.arrayContaining(["ROUTE_MISMATCH"]),
    });
  });

  it.each([
    [{ ...eligibleMedia, bucketName: "profile-media" }, "MEDIA_INELIGIBLE"],
    [{ ...eligibleMedia, kind: "COVER" }, "MEDIA_INELIGIBLE"],
    [{ ...eligibleMedia, status: "ARCHIVED" }, "MEDIA_INELIGIBLE"],
    [{ ...eligibleMedia, ownerAccountRole: "COMPANY" }, "MEDIA_INELIGIBLE"],
    [
      { ...eligibleMedia, archivedAt: new Date("2026-08-01T00:00:00.000Z") },
      "MEDIA_INELIGIBLE",
    ],
  ] as const)("requires active private sponsorship media", (media, issue) => {
    expect(
      validatePlacementForActivation({
        featuredCreator: null,
        media,
        mediaMobile: null,
        mediaTablet: null,
        placement,
      }),
    ).toMatchObject({
      eligible: false,
      issues: expect.arrayContaining([issue]),
    });
  });

  it.each([
    {
      accountArchivedAt: null,
      accountStatus: "BANNED",
      completionPercentage: 100,
      profileArchivedAt: null,
      profileId: creatorProfileId,
    },
    {
      accountArchivedAt: null,
      accountStatus: "APPROVED",
      completionPercentage: 90,
      profileArchivedAt: null,
      profileId: creatorProfileId,
    },
    {
      accountArchivedAt: null,
      accountStatus: "APPROVED",
      completionPercentage: 100,
      profileArchivedAt: new Date("2026-08-01T00:00:00.000Z"),
      profileId: creatorProfileId,
    },
  ] as const)(
    "suppresses an ineligible featured creator",
    (featuredCreator) => {
      const featuredPlacement: SponsorshipPlacementCandidate = {
        ...placement,
        creativeAssetId: null,
        featuredCreatorProfileId: creatorProfileId,
        placementType: "FEATURED_CREATOR",
        slotKey: "catalog-featured",
      };

      expect(
        evaluatePlacement(
          evaluation({
            allowedPlacementTypes: ["FEATURED_CREATOR"],
            featuredCreator,
            media: null,
            placement: featuredPlacement,
            route: "CATALOG",
            slotKey: "catalog-featured",
            viewer: "APPROVED_COMPANY",
          }),
        ),
      ).toMatchObject({
        eligible: false,
        issues: expect.arrayContaining(["FEATURED_CREATOR_INELIGIBLE"]),
      });
    },
  );

  it("allows a complete approved featured creator on an approved route", () => {
    const featuredPlacement: SponsorshipPlacementCandidate = {
      ...placement,
      creativeAssetId: null,
      featuredCreatorProfileId: creatorProfileId,
      placementType: "FEATURED_CREATOR",
      slotKey: "catalog-featured",
    };

    expect(
      isPlacementEligible(
        evaluation({
          allowedPlacementTypes: ["FEATURED_CREATOR"],
          featuredCreator: {
            accountArchivedAt: null,
            accountStatus: "APPROVED",
            completionPercentage: 100,
            profileArchivedAt: null,
            profileId: creatorProfileId,
          },
          media: null,
          placement: featuredPlacement,
          route: "CATALOG",
          slotKey: "catalog-featured",
          viewer: "APPROVED_COMPANY",
        }),
      ),
    ).toBe(true);
  });

  it("suppresses a non-featured placement carrying a protected profile reference", () => {
    expect(
      validatePlacementForActivation({
        featuredCreator: null,
        media: eligibleMedia,
        mediaMobile: null,
        mediaTablet: null,
        placement: {
          ...placement,
          featuredCreatorProfileId: creatorProfileId,
        },
      }),
    ).toMatchObject({
      eligible: false,
      issues: expect.arrayContaining(["FEATURED_CREATOR_INELIGIBLE"]),
    });
  });

  it("suppresses participant-derived public creative while social proof is disabled", () => {
    expect(
      evaluatePlacement(
        evaluation({
          placement: {
            ...placement,
            advertiserAccountId: "20000000-0000-4000-8000-000000000006",
          },
        }),
      ),
    ).toMatchObject({
      eligible: false,
      issues: expect.arrayContaining(["PUBLIC_PARTICIPANT_CREATIVE_FORBIDDEN"]),
    });
  });

  it("orders ties deterministically by sort order then id", () => {
    const ordered = sortEligiblePlacements([
      { ...placement, id: "20000000-0000-4000-8000-000000000003" },
      {
        ...placement,
        id: "20000000-0000-4000-8000-000000000001",
        sortOrder: 11,
      },
      { ...placement, id: "20000000-0000-4000-8000-000000000001" },
    ]);

    expect(ordered.map(({ id, sortOrder }) => [sortOrder, id])).toEqual([
      [10, "20000000-0000-4000-8000-000000000001"],
      [10, "20000000-0000-4000-8000-000000000003"],
      [11, "20000000-0000-4000-8000-000000000001"],
    ]);
  });
});
