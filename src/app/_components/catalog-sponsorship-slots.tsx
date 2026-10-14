import "server-only";

import { randomInt as defaultRandomInt } from "node:crypto";
import type { ReactNode } from "react";

import {
  getPlacementSlot,
  type RendererPlacementDto,
  SponsorshipCarousel,
  type SponsorshipCreativeViewModel,
  SponsorshipFeaturedCreator,
  type SponsorshipFeaturedCreatorItem,
  SponsorshipFeaturedCreatorsRow,
  SponsorshipCatalogCard,
  getSafeSponsorshipExternalHref,
  SponsorshipHeroBanner,
  SponsorshipSidePlacement,
} from "@/features/sponsorships";

export interface CatalogSponsorshipSlotDto {
  audienceMatches: boolean;
  placement: RendererPlacementDto;
  routeMatches: boolean;
}

export interface CatalogSponsorshipSlotsDto {
  carousel?: readonly CatalogSponsorshipSlotDto[];
  featured?: readonly CatalogSponsorshipSlotDto[];
  midlist?: readonly CatalogSponsorshipSlotDto[];
  side?: CatalogSponsorshipSlotDto | null;
  top?: CatalogSponsorshipSlotDto | null;
}

function placementForSlot(
  slot: CatalogSponsorshipSlotDto | null | undefined,
  expectedType: RendererPlacementDto["type"],
) {
  if (
    !slot ||
    !slot.audienceMatches ||
    !slot.routeMatches ||
    slot.placement.eligible !== true ||
    slot.placement.type !== expectedType
  ) {
    return null;
  }

  return slot.placement;
}

function toCreativeViewModel(
  placement: RendererPlacementDto,
): SponsorshipCreativeViewModel {
  return {
    ...placement,
    appearance: placement,
    audienceMatches: true,
    advertiserLabel: placement.advertiserLabel,
    body: placement.body,
    eligible: placement.eligible,
    id: placement.id,
    link:
      placement.linkUrl && getSafeSponsorshipExternalHref(placement.linkUrl)
        ? {
            href: placement.linkUrl,
            buttonLabel: placement.linkLabel,
            onCreative: placement.linkOnCreative,
          }
        : null,
    media: placement.media,
    mediaMobile: placement.mediaMobile,
    mediaTablet: placement.mediaTablet,
    participantDerived: placement.type === "FEATURED_CREATOR",
    routeMatches: true,
    title: placement.title,
    viewerIsPublic: false,
  };
}

/**
 * Fisher–Yates over a copy of `items`. The RNG is injectable so tests can pin
 * the order; `randomInt(max)` must return an integer in `[0, max)`.
 */
export function shuffle<T>(
  items: readonly T[],
  randomInt: (max: number) => number = defaultRandomInt,
): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);

    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

/**
 * The app composes opaque sponsored cards; catalog owns their insertion positions.
 * Order is reshuffled on every catalog request (Server Component, never cached),
 * then capped at the `catalog-midlist` slot limit.
 */
export function buildCatalogSponsoredCards(
  slots?: CatalogSponsorshipSlotsDto,
  randomInt: (max: number) => number = defaultRandomInt,
): { key: string; node: ReactNode }[] {
  const midlist =
    slots?.midlist?.flatMap((slot) => {
      const placement = placementForSlot(slot, "CAROUSEL");

      return placement ? [placement] : [];
    }) ?? [];
  const limit = getPlacementSlot("catalog-midlist")!.limit;

  return shuffle(midlist, randomInt)
    .slice(0, limit)
    .map((placement) => ({
      key: placement.id,
      node: (
        <SponsorshipCatalogCard creative={toCreativeViewModel(placement)} />
      ),
    }));
}

export function CatalogSponsorshipSlots({
  children,
  slots,
}: {
  children: ReactNode;
  slots?: CatalogSponsorshipSlotsDto;
}) {
  const top = placementForSlot(slots?.top, "TOP_BANNER");
  const side = placementForSlot(slots?.side, "INLINE_BANNER");
  const carousel =
    slots?.carousel?.flatMap((slot) => {
      const placement = placementForSlot(slot, "CAROUSEL");

      return placement ? [placement] : [];
    }) ?? [];
  const featured: SponsorshipFeaturedCreatorItem[] =
    slots?.featured?.flatMap((slot) => {
      const placement = placementForSlot(slot, "FEATURED_CREATOR");
      const creator = placement?.featuredCreator;

      return placement && creator
        ? [
            {
              creative: toCreativeViewModel(placement),
              creator: {
                creatorTypeLabel: "Creator",
                detailHref: `/app/creators/${creator.creatorId}`,
                displayName: creator.displayName,
                eligible: placement.eligible,
                media: creator.avatar,
              },
            },
          ]
        : [];
    }) ?? [];

  if (!top && !side && carousel.length === 0 && featured.length === 0) {
    return children;
  }

  const mainContent = (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {carousel.length > 0 ? (
        <SponsorshipCarousel
          creatives={carousel.map(toCreativeViewModel)}
          label="Patrocínios no catálogo"
        />
      ) : null}

      {featured.length === 1 ? (
        <SponsorshipFeaturedCreator {...featured[0]} />
      ) : featured.length > 1 ? (
        <SponsorshipFeaturedCreatorsRow items={featured} />
      ) : null}

      {children}
    </div>
  );

  return (
    <div
      className="w-full min-w-0 space-y-4 sm:space-y-6"
      data-slot="catalog-sponsorship-layout"
    >
      {top ? (
        <SponsorshipHeroBanner creative={toCreativeViewModel(top)} />
      ) : null}

      {side ? (
        <div
          className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
          data-slot="catalog-with-side-placement"
        >
          <div
            className="order-2 min-w-0 lg:order-1"
            data-slot="catalog-main-content"
          >
            {mainContent}
          </div>
          <div
            className="order-1 min-w-0 lg:order-2"
            data-slot="catalog-side-placement"
          >
            <SponsorshipSidePlacement creative={toCreativeViewModel(side)} />
          </div>
        </div>
      ) : (
        mainContent
      )}
    </div>
  );
}
