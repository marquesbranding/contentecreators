"use client";

import {
  CAROUSEL_AUTO_ADVANCE_MS,
  useAutoAdvance,
} from "@/shared/hooks/use-auto-advance";
import { cn } from "@/shared/lib/cn";

import { SponsorshipCarouselControls } from "./sponsorship-carousel-controls";
import { SponsorshipHeroBanner } from "./sponsorship-hero-banner";
import type { SponsorshipCreativeViewModel } from "./sponsorship-presentation";

/** Same 5 s rhythm as every other public carousel. */
export const HERO_ROTATION_INTERVAL_MS = CAROUSEL_AUTO_ADVANCE_MS;

/**
 * Two or more full-width banners shown one at a time with a 300 ms
 * crossfade. A single banner never reaches this component (callers render
 * `SponsorshipHeroBanner` directly), so there is nothing to rotate here.
 * The banners themselves are untouched; the control bar (arrows, indicator
 * dots, discreet pause button) sits below them, centered.
 *
 * The banners are stacked in one grid cell so the region keeps the height of
 * the (identical-ratio) banners; only the active one is exposed to assistive
 * technology and the tab order. Timer and pause rules (hover, keyboard
 * focus, hidden tab, manual pause, reduced motion) live in
 * `useAutoAdvance`; with reduced motion there is no autoplay and no
 * transition, and the arrows and indicators are the way to change banner.
 */
export function SponsorshipHeroRotator({
  creatives,
  label = "Banners patrocinados",
}: {
  creatives: readonly SponsorshipCreativeViewModel[];
  label?: string;
}) {
  const {
    activeIndex,
    canAutoplay,
    goTo,
    interactionProps,
    isPlaying,
    manuallyPaused,
    next,
    previous,
    togglePaused,
  } = useAutoAdvance({
    count: creatives.length,
    intervalMs: HERO_ROTATION_INTERVAL_MS,
  });

  if (creatives.length === 1) {
    // Defensive: callers already render one banner directly, and a single
    // banner never gets dots, arrows or autoplay.
    return <SponsorshipHeroBanner creative={creatives[0]} />;
  }

  return (
    <section
      aria-label={label}
      aria-roledescription="carrossel"
      data-slot="sponsorship-hero-rotator"
      role="region"
      {...interactionProps}
    >
      <div
        aria-live={isPlaying ? "off" : "polite"}
        className="grid"
        data-testid="hero-rotator-slides"
      >
        {creatives.map((creative, index) => {
          const active = index === activeIndex;

          return (
            <div
              aria-hidden={active ? undefined : true}
              aria-label={`Banner ${index + 1} de ${creatives.length}`}
              aria-roledescription="slide"
              className={cn(
                "col-start-1 row-start-1 min-w-0 motion-safe:transition-opacity motion-safe:duration-300",
                active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              data-active={active}
              inert={!active}
              key={creative.id}
              role="group"
            >
              <SponsorshipHeroBanner
                creative={creative}
                deferImage={index > 0}
              />
            </div>
          );
        })}
      </div>

      <SponsorshipCarouselControls
        activeIndex={activeIndex}
        canAutoplay={canAutoplay}
        className="mt-4"
        count={creatives.length}
        groupLabel="Escolher banner"
        indicatorLabel={(index, count) =>
          `Ir para o banner ${index + 1} de ${count}`
        }
        manuallyPaused={manuallyPaused}
        nextLabel="Próximo banner"
        onNext={next}
        onPrevious={previous}
        onSelect={goTo}
        onTogglePaused={togglePaused}
        pauseLabel="Pausar rotação dos banners"
        previousLabel="Banner anterior"
        resumeLabel="Retomar rotação dos banners"
      />
    </section>
  );
}
