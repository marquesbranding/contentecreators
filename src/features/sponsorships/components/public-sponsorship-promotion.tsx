import { SponsorshipHeroBanner } from "./sponsorship-hero-banner";
import { SponsorshipHeroRotator } from "./sponsorship-hero-rotator.client";
import type { RendererPlacementDto } from "../types/sponsorship-placement.types";
import {
  getSafeSponsorshipExternalHref,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";

function isRenderablePublicPromotion(
  promotion: RendererPlacementDto | null,
): promotion is RendererPlacementDto & {
  media: NonNullable<RendererPlacementDto["media"]>;
  type: "TOP_BANNER";
} {
  return Boolean(
    promotion &&
    promotion.eligible &&
    promotion.type === "TOP_BANNER" &&
    promotion.featuredCreator == null &&
    promotion.media &&
    getSafeSponsorshipExternalHref(promotion.media.url),
  );
}

function toPublicCreative(
  promotion: ReturnType<typeof renderablePromotion> & object,
): SponsorshipCreativeViewModel {
  const link =
    promotion.linkUrl && getSafeSponsorshipExternalHref(promotion.linkUrl)
      ? {
          href: promotion.linkUrl,
          buttonLabel: promotion.linkLabel,
          onCreative: promotion.linkOnCreative,
        }
      : null;

  return {
    audienceMatches: true,
    ...promotion,
    appearance: promotion,
    advertiserLabel: promotion.advertiserLabel,
    body: promotion.body,
    eligible: true,
    id: promotion.id,
    link,
    media: promotion.media,
    mediaMobile: promotion.mediaMobile,
    mediaTablet: promotion.mediaTablet,
    participantDerived: false,
    publicSocialProofEnabled: false,
    routeMatches: true,
    title: promotion.title,
    viewerIsPublic: true,
  };
}

function renderablePromotion(promotion: RendererPlacementDto | null) {
  return isRenderablePublicPromotion(promotion) ? promotion : null;
}

/**
 * Landing banners. None renders nothing, one renders exactly the static
 * hero banner, two or more rotate (see `SponsorshipHeroRotator`).
 */
export function PublicSponsorshipPromotion({
  promotions,
}: {
  promotions: readonly RendererPlacementDto[] | null;
}) {
  const creatives = (promotions ?? []).flatMap((promotion) => {
    const renderable = renderablePromotion(promotion);

    return renderable ? [toPublicCreative(renderable)] : [];
  });

  if (creatives.length === 0) {
    return null;
  }

  return (
    <div
      className="mx-auto w-full max-w-[90rem] min-w-0 px-5 py-6 sm:px-8 sm:py-8 lg:px-12"
      data-slot="public-sponsorship-promotion"
    >
      {creatives.length === 1 ? (
        <SponsorshipHeroBanner creative={creatives[0]} />
      ) : (
        <SponsorshipHeroRotator creatives={creatives} />
      )}
    </div>
  );
}
