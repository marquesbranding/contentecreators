import type { ReactNode } from "react";

import {
  type RendererPlacementDto,
  SponsorshipCarousel,
  type SponsorshipCreativeViewModel,
  SponsorshipFeaturedCreator,
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
    audienceMatches: true,
    body: placement.body,
    eligible: placement.eligible,
    id: placement.id,
    link:
      placement.linkLabel && placement.linkUrl
        ? {
            href: placement.linkUrl,
            label: placement.linkLabel,
          }
        : null,
    media: placement.media,
    participantDerived: placement.type === "FEATURED_CREATOR",
    routeMatches: true,
    title: placement.title,
    viewerIsPublic: false,
  };
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

  return (
    <div
      className="w-full min-w-0 space-y-4 sm:space-y-6"
      data-slot="catalog-sponsorship-layout"
    >
      {top ? (
        <SponsorshipHeroBanner creative={toCreativeViewModel(top)} />
      ) : null}

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

      {side ? (
        <div
          className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
          data-slot="catalog-with-side-placement"
        >
          <div
            className="order-2 min-w-0 lg:order-1"
            data-slot="catalog-main-content"
          >
            {children}
          </div>
          <div
            className="order-1 min-w-0 lg:order-2"
            data-slot="catalog-side-placement"
          >
            <SponsorshipSidePlacement creative={toCreativeViewModel(side)} />
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
