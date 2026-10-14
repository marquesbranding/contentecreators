"use client";

import { CAROUSEL_AUTO_ADVANCE_MS } from "@/shared/hooks/use-auto-advance";

import { SponsorshipCarouselControls } from "./sponsorship-carousel-controls";
import {
  isFeaturedCreatorItemVisible,
  SponsorshipFeaturedCreatorCard,
  type SponsorshipFeaturedCreatorItem,
} from "./sponsorship-featured-creator-card";
import { useCardRowCarousel } from "./use-card-row-carousel";

export const FEATURED_ROTATION_INTERVAL_MS = CAROUSEL_AUTO_ADVANCE_MS;

/**
 * Featured creators side by side (1/2/3/4 per row by breakpoint, like
 * `SponsorshipCarousel`). While they all fit, the row is static: no motion,
 * no controls. Once they overflow the available width, it advances one card
 * every 5 seconds and wraps to the start, with the same control bar (arrows,
 * indicator dots below, discreet pause button) and pause rules as the other
 * carousels (`useCardRowCarousel`). Under reduced motion it never advances
 * by itself but stays navigable by arrows, dots and manual scrolling.
 */
export function SponsorshipFeaturedCreatorsRow({
  items,
  label = "Criadores em destaque",
}: {
  items: readonly SponsorshipFeaturedCreatorItem[];
  label?: string;
}) {
  const visibleItems = items.filter(isFeaturedCreatorItemVisible);
  const count = visibleItems.length;
  const {
    activeIndex,
    canAutoplay,
    goTo,
    handleScroll,
    interactionProps,
    isPlaying,
    layout,
    listRef,
    manuallyPaused,
    next,
    previous,
    togglePaused,
  } = useCardRowCarousel({ count });

  if (count === 0) {
    return null;
  }

  return (
    <section
      aria-label={label}
      aria-roledescription={layout.overflowing ? "carrossel" : undefined}
      data-overflowing={layout.overflowing}
      data-slot="sponsorship-featured-creators-row"
      role="region"
      {...interactionProps}
    >
      <ul
        aria-live={layout.overflowing && !isPlaying ? "polite" : "off"}
        // `relative`: absolutely positioned bits inside the cards (sr-only text,
        // stretched links) would otherwise escape the scroller and widen the page.
        className="relative -mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-4 overflow-x-auto px-4 py-1 sm:mx-0 sm:scroll-pl-0 sm:px-0"
        onScroll={handleScroll}
        ref={listRef}
      >
        {visibleItems.map((item) => (
          <li
            className="min-w-0 shrink-0 grow basis-full snap-start sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)]"
            key={item.creative.id}
          >
            <SponsorshipFeaturedCreatorCard {...item} />
          </li>
        ))}
      </ul>
      {layout.overflowing ? (
        <SponsorshipCarouselControls
          activeIndex={activeIndex}
          canAutoplay={canAutoplay}
          className="mt-3"
          count={layout.stops}
          groupLabel="Escolher criador em destaque"
          indicatorLabel={(index, total) =>
            `Ir para a posição ${index + 1} de ${total} dos criadores em destaque`
          }
          manuallyPaused={manuallyPaused}
          nextLabel="Próximo criador em destaque"
          onNext={next}
          onPrevious={previous}
          onSelect={goTo}
          onTogglePaused={togglePaused}
          pauseLabel="Pausar rotação dos criadores em destaque"
          previousLabel="Criador em destaque anterior"
          resumeLabel="Retomar rotação dos criadores em destaque"
        />
      ) : null}
    </section>
  );
}
