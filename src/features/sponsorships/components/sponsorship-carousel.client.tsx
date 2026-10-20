"use client";

import { useMemo } from "react";

import { SponsorshipCarouselControls } from "./sponsorship-carousel-controls";
import { SponsorshipCatalogCard } from "./sponsorship-catalog-card";
import {
  isSponsorshipCreativeVisible,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";
import { useCardRowCarousel } from "./use-card-row-carousel";

/**
 * Catalog sponsorship cards side by side (1/2/3/4 per row by breakpoint).
 * While they all fit, the row is static (a single card never gets controls).
 * Once they overflow it advances one card every 5 seconds and wraps to the
 * start, with only the indicator dots, overlaid on the bottom of the cards (no
 * arrows, no pause button) and the same automatic pause rules as the other carousels
 * (`useCardRowCarousel`). ArrowLeft/ArrowRight move it from anywhere inside.
 */
export function SponsorshipCarousel({
  creatives,
  label = "Patrocínios em destaque",
}: {
  creatives: SponsorshipCreativeViewModel[];
  label?: string;
}) {
  const visibleCreatives = useMemo(
    () => creatives.filter(isSponsorshipCreativeVisible),
    [creatives],
  );
  const {
    activeIndex,
    goTo,
    handleScroll,
    interactionProps,
    isPlaying,
    layout,
    listRef,
    next,
    previous,
  } = useCardRowCarousel({ count: visibleCreatives.length });

  if (visibleCreatives.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={label}
      aria-roledescription="carrossel"
      className="space-y-4"
      data-overflowing={layout.overflowing}
      data-slot="sponsorship-carousel"
      role="region"
      tabIndex={layout.overflowing ? 0 : undefined}
      {...interactionProps}
    >
      <div>
        <h2 className="text-xl font-bold tracking-[-0.02em]">{label}</h2>
        {layout.overflowing ? (
          <p className="text-muted-foreground mt-1 text-sm">
            Use os pontos ou as setas do teclado para navegar.
          </p>
        ) : null}
      </div>

      <div className="relative">
        <ul
          aria-label="Lista de patrocínios"
          aria-live={layout.overflowing && !isPlaying ? "polite" : "off"}
          // `relative`: absolutely positioned bits inside the cards (stretched
          // links, sr-only text) would otherwise escape the scroller and widen
          // the page.
          className="relative -mx-4 flex snap-x snap-mandatory scroll-pl-4 [scrollbar-width:none] gap-4 overflow-x-auto px-4 py-1 sm:mx-0 sm:scroll-pl-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          onScroll={handleScroll}
          ref={listRef}
        >
          {visibleCreatives.map((creative) => (
            <li
              className="min-w-0 shrink-0 grow basis-full snap-start sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)]"
              key={creative.id}
            >
              <SponsorshipCatalogCard creative={creative} />
            </li>
          ))}
        </ul>

        {layout.overflowing ? (
          <SponsorshipCarouselControls
            activeIndex={activeIndex}
            className="pointer-events-none absolute inset-x-0 bottom-4 z-10 [&>div]:pointer-events-auto [&>div]:rounded-full [&>div]:bg-black/45 [&>div]:px-3 [&>div]:py-1.5 [&>div]:backdrop-blur-sm"
            count={layout.stops}
            groupLabel="Escolher patrocínio"
            indicatorLabel={(index, total) =>
              `Ir para a posição ${index + 1} de ${total} dos patrocínios`
            }
            nextLabel="Próximo patrocínio"
            onNext={next}
            onPrevious={previous}
            onSelect={goTo}
            previousLabel="Patrocínio anterior"
            variant="overlay"
          />
        ) : null}
      </div>
    </section>
  );
}
