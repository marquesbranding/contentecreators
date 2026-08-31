import { SignedImage } from "@/shared/components/signed-image";

import {
  getSafeSponsorshipExternalHref,
  isSponsorshipCreativeVisible,
  SponsorshipLabels,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";

/**
 * A row of portrait-ish ad cards meant to break up a long listing, rather than
 * to sit above it. The 5:4 creative is a deliberate contrast with the 16:8 used
 * by every other placement, so the row reads as a separate wave of ads.
 */
export function SponsorshipGridRow({
  creatives,
  label = "Patrocínios",
}: {
  creatives: readonly SponsorshipCreativeViewModel[];
  label?: string;
}) {
  const visibleCreatives = creatives.filter(isSponsorshipCreativeVisible);

  if (visibleCreatives.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={label}
      className="w-full"
      data-slot="sponsorship-grid-row"
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCreatives.map((creative) => {
          const href = creative.link
            ? getSafeSponsorshipExternalHref(creative.link.href)
            : null;
          const card = (
            <>
              {creative.media ? (
                <SignedImage
                  alt={creative.media.alt}
                  className="object-cover"
                  height={creative.media.height}
                  src={creative.media.url}
                  width={creative.media.width}
                  wrapperClassName="aspect-[5/4] w-full"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="from-brand-blue/30 via-brand-pink/15 to-brand-lime/25 aspect-[5/4] w-full bg-gradient-to-br"
                />
              )}
              <div className="space-y-2 p-4">
                <SponsorshipLabels
                  advertiserLabel={creative.advertiserLabel}
                  previewMode={creative.previewMode}
                />
                <h3 className="text-base leading-snug font-bold tracking-[-0.01em]">
                  {creative.title}
                </h3>
                {creative.body ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm leading-5">
                    {creative.body}
                  </p>
                ) : null}
              </div>
            </>
          );

          return (
            <li className="min-w-0" key={creative.id}>
              {href ? (
                <a
                  className="bg-card ring-foreground/10 hover:ring-brand-blue/30 block overflow-hidden rounded-2xl ring-1 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-blue-400 focus-visible:outline-none"
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {card}
                </a>
              ) : (
                <div className="bg-card ring-foreground/10 overflow-hidden rounded-2xl ring-1">
                  {card}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
