import { SignedImage } from "@/shared/components/signed-image";
import { cn } from "@/shared/lib/cn";

import {
  getSafeSponsorshipExternalHref,
  isSponsorshipCreativeVisible,
  SponsorshipLabels,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";

/**
 * A full-bleed promotional banner for the logged-in catalog: the creative fills
 * the frame and the copy sits on top of it.
 *
 * Deliberately separate from `SponsorshipTopBanner`, which is a side-by-side
 * card shared with the public landing page — this layout is catalog-only.
 */
export function SponsorshipHeroBanner({
  creative,
}: {
  creative: SponsorshipCreativeViewModel;
}) {
  if (!isSponsorshipCreativeVisible(creative)) {
    return null;
  }

  const href = creative.link
    ? getSafeSponsorshipExternalHref(creative.link.href)
    : null;

  return (
    <section
      aria-label={`Patrocínio: ${creative.title}`}
      className="relative isolate w-full overflow-hidden rounded-3xl"
      data-slot="sponsorship-hero-banner"
    >
      {creative.media ? (
        <SignedImage
          alt={creative.media.alt}
          className="object-cover"
          fetchPriority="high"
          height={creative.media.height}
          loading="eager"
          src={creative.media.url}
          width={creative.media.width}
          wrapperClassName="aspect-[4/3] w-full sm:aspect-[16/7] lg:aspect-[16/6]"
        />
      ) : (
        <div
          aria-hidden="true"
          className="from-brand-night via-brand-royal to-brand-blue aspect-[4/3] w-full bg-gradient-to-br sm:aspect-[16/7] lg:aspect-[16/6]"
        />
      )}

      {/* Darkens the side the copy sits on so the text stays legible over any
       * creative the advertiser uploads. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-transparent"
      />

      <div className="absolute inset-0 flex flex-col justify-center gap-3 p-5 text-white sm:gap-4 sm:p-8 lg:p-12">
        <SponsorshipLabels
          advertiserLabel={creative.advertiserLabel}
          previewMode={creative.previewMode}
        />
        <h2 className="max-w-xl text-2xl leading-[1.1] font-extrabold tracking-[-0.035em] text-balance sm:text-4xl lg:text-5xl">
          {creative.title}
        </h2>
        {creative.body ? (
          <p className="hidden max-w-md text-sm leading-6 text-white/80 sm:block sm:text-base sm:leading-7">
            {creative.body}
          </p>
        ) : null}
        {href && creative.link ? (
          <a
            className={cn(
              "bg-brand-lime text-brand-night mt-1 inline-flex min-h-11 w-fit items-center justify-center rounded-full px-5 text-sm font-bold whitespace-nowrap transition-colors",
              "hover:bg-brand-lime/90 focus-visible:ring-3 focus-visible:ring-white/80 focus-visible:outline-none sm:text-base",
            )}
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {creative.link.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}
