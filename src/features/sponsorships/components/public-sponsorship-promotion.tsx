import type { RendererPlacementDto } from "../types/sponsorship-placement.types";
import {
  getSafeSponsorshipExternalHref,
  SponsorshipTopBanner,
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
    getSafeSponsorshipExternalHref(promotion.media.url) &&
    promotion.title.trim(),
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
    promotion.linkLabel && promotion.linkUrl
      ? {
          href: promotion.linkUrl,
          label: promotion.linkLabel,
        }
      : null;

  return (
    <div
      className="mx-auto w-full max-w-[90rem] min-w-0 px-5 py-12 sm:px-8 sm:py-16 lg:px-12"
      data-slot="public-sponsorship-promotion"
    >
      <SponsorshipTopBanner
        creative={{
          audienceMatches: true,
          body: promotion.body,
          eligible: true,
          id: promotion.id,
          link,
          media: promotion.media,
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
