import type { ReactNode } from "react";

import {
  type RendererPlacementDto,
  SponsorshipCarousel,
  type SponsorshipCreativeViewModel,
  SponsorshipFeaturedCreator,
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
  featured?: CatalogSponsorshipSlotDto | null;
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

/** The app composes opaque sponsored cards; catalog owns their insertion positions. */
export function buildCatalogSponsoredCards(
  slots?: CatalogSponsorshipSlotsDto,
): { key: string; node: ReactNode }[] {
  const midlist =
    slots?.midlist?.flatMap((slot) => {
      const placement = placementForSlot(slot, "CAROUSEL");

      return placement ? [placement] : [];
    }) ?? [];

  return midlist.slice(0, 3).map((placement) => ({
    key: placement.id,
    node: <SponsorshipCatalogCard creative={toCreativeViewModel(placement)} />,
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
  const featured = placementForSlot(slots?.featured, "FEATURED_CREATOR");
  const featuredCreator = featured?.featuredCreator ?? null;

  if (!top && !side && carousel.length === 0 && !featuredCreator) {
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

      {featured && featuredCreator ? (
        <SponsorshipFeaturedCreator
          creative={toCreativeViewModel(featured)}
          creator={{
            creatorTypeLabel: "Creator",
            detailHref: `/app/creators/${featuredCreator.creatorId}`,
            displayName: featuredCreator.displayName,
            eligible: featured.eligible,
            media: featuredCreator.avatar,
          }}
        />
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
