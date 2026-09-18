import { SponsorshipHeroBanner } from "./sponsorship-hero-banner";
import type { RendererPlacementDto } from "../types/sponsorship-placement.types";
import { getSafeSponsorshipExternalHref } from "./sponsorship-presentation";

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

export function PublicSponsorshipPromotion({
  promotion,
}: {
  promotion: RendererPlacementDto | null;
}) {
  if (!isRenderablePublicPromotion(promotion)) {
    return null;
  }

  const link =
    promotion.linkUrl && getSafeSponsorshipExternalHref(promotion.linkUrl)
      ? {
          href: promotion.linkUrl,
          buttonLabel: promotion.linkLabel,
          onCreative: promotion.linkOnCreative,
        }
      : null;

  return (
    <div
      className="mx-auto w-full max-w-[90rem] min-w-0 px-5 py-6 sm:px-8 sm:py-8 lg:px-12"
      data-slot="public-sponsorship-promotion"
    >
      <SponsorshipHeroBanner
        creative={{
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
        }}
      />
    </div>
  );
}
