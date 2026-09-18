import { sponsorshipFontVariables } from "../domain/sponsorship-fonts";
import {
  toAppearanceStyle,
  sponsorshipAccessibleName,
} from "../domain/sponsorship-appearance";
import { SignedImage } from "@/shared/components/signed-image";
import { cn } from "@/shared/lib/cn";

import {
  SponsorshipCreativeLink,
  SponsorshipExternalLink,
  isSponsorshipCreativeVisible,
  SPONSORSHIP_TABLET_BREAKPOINT,
  SponsorshipLabels,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";

/* Roughly 60px shorter than the previous 4/3 · 16/7 · 16/6 ratios at typical
 * viewport widths. */
const heroAspectClassName =
  "col-start-1 row-start-1 aspect-[16/9] h-full w-full sm:aspect-[16/6] lg:aspect-[16/5]";

/** Full-width creative shared by the public landing and catalog. */
export function SponsorshipHeroBanner({
  creative,
}: {
  creative: SponsorshipCreativeViewModel;
}) {
  if (!isSponsorshipCreativeVisible(creative)) {
    return null;
  }

  return (
    <section
      aria-label={sponsorshipAccessibleName(creative)}
      className={cn(
        "relative isolate grid w-full overflow-hidden rounded-3xl",
        sponsorshipFontVariables,
      )}
      data-slot="sponsorship-hero-banner"
    >
      {creative.media ? (
        <SignedImage
          alt={creative.media.alt}
          className="object-cover"
          fetchPriority="high"
          height={creative.media.height}
          loading="eager"
          sources={[
            creative.mediaMobile && {
              media: "(max-width: 639px)",
              src: creative.mediaMobile.url,
            },
            creative.mediaTablet && {
              media: `${SPONSORSHIP_TABLET_BREAKPOINT} and (max-width: 1023px)`,
              src: creative.mediaTablet.url,
            },
          ].filter((source) => source !== null && source !== undefined)}
          src={creative.media.url}
          width={creative.media.width}
          wrapperClassName={heroAspectClassName}
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn("bg-brand-night", heroAspectClassName)}
        />
      )}

      <SponsorshipCreativeLink creative={creative} />
      {creative.title ||
      creative.body ||
      creative.link?.buttonLabel ||
      creative.showSponsoredBadge !== false ||
      (creative.showAdvertiserLabel && creative.advertiserLabel) ||
      creative.previewMode ? (
        <div
          style={toAppearanceStyle(creative.appearance)}
          className="relative col-start-1 row-start-1 flex min-w-0 flex-col justify-center gap-3 p-5 text-white sm:gap-4 sm:p-8 lg:p-12"
        >
          <SponsorshipLabels {...creative} previewMode={creative.previewMode} />
          {creative.title ? (
            <h2 className="max-w-xl text-2xl leading-[1.1] font-extrabold tracking-[-0.035em] text-balance break-words sm:text-4xl lg:text-5xl">
              {creative.title}
            </h2>
          ) : null}
          {creative.body ? (
            <p
              style={toAppearanceStyle(creative.appearance)}
              className="hidden max-w-md text-sm leading-6 text-white/80 sm:block sm:text-base sm:leading-7"
            >
              {creative.body}
            </p>
          ) : null}
          {creative.link?.buttonLabel ? (
            <SponsorshipExternalLink
              appearance={creative.appearance}
              className="bg-brand-lime text-brand-night hover:bg-brand-lime/90 mt-1 w-fit max-w-full rounded-full font-bold whitespace-normal"
              link={creative.link}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
