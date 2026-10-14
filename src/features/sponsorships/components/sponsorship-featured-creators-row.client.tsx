"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAutoAdvance } from "@/shared/hooks/use-auto-advance";

import { SponsorshipCarouselControls } from "./sponsorship-carousel-controls";
import {
  isFeaturedCreatorItemVisible,
  SponsorshipFeaturedCreatorCard,
  type SponsorshipFeaturedCreatorItem,
} from "./sponsorship-featured-creator-card";

export const FEATURED_ROTATION_INTERVAL_MS = 5_000;

/** After the last scroll event of a gesture/animation, this long means "settled". */
const SCROLL_SETTLE_MS = 150;
/** Sub-pixel layout rounding must not count as overflow or as a misaligned row. */
const LAYOUT_TOLERANCE_PX = 2;

interface RowLayout {
  maxScroll: number;
  overflowing: boolean;
  /** Number of positions the row can rest at, one card apart. */
  stops: number;
  /** Distance between the left edges of two neighbouring cards. */
  unit: number;
}

const STATIC_LAYOUT: RowLayout = {
  maxScroll: 0,
  overflowing: false,
  stops: 1,
  unit: 0,
};

function measureRow(list: HTMLElement, count: number): RowLayout {
  const maxScroll = list.scrollWidth - list.clientWidth;

  if (count < 2 || maxScroll <= LAYOUT_TOLERANCE_PX) {
    return STATIC_LAYOUT;
  }

  const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
  const unit = (list.scrollWidth + gap) / count;

  return {
    maxScroll,
    overflowing: true,
    stops: Math.min(count, Math.ceil(maxScroll / unit) + 1),
    unit,
  };
}

function sameLayout(a: RowLayout, b: RowLayout) {
  return (
    a.overflowing === b.overflowing &&
    a.stops === b.stops &&
    Math.abs(a.unit - b.unit) < 0.5 &&
    Math.abs(a.maxScroll - b.maxScroll) < 0.5
  );
}

/**
 * Featured creators side by side (1/2/3/4 per row by breakpoint, like
 * `SponsorshipCarousel`). While they all fit, the row is static: no motion,
 * no indicators. Once they overflow the available width, it advances one
 * card every 5 seconds and wraps to the start, with the same pause rules
 * and indicators as the landing banner rotator (`useAutoAdvance`). Under
 * reduced motion it never advances by itself but stays manually scrollable.
 *
 * Overflow is measured on the client with a `ResizeObserver`; the server and
 * the first client render are always the static layout, so there is nothing
 * to mismatch on hydration.
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
  const listRef = useRef<HTMLUListElement>(null);
  const settleTimerRef = useRef<number | undefined>(undefined);
  const [layout, setLayout] = useState<RowLayout>(STATIC_LAYOUT);

  const {
    activeIndex,
    canAutoplay,
    goTo,
    interactionProps,
    isPlaying,
    manuallyPaused,
    reducedMotion,
    togglePaused,
  } = useAutoAdvance({
    count: layout.stops,
    enabled: layout.overflowing,
    intervalMs: FEATURED_ROTATION_INTERVAL_MS,
  });

  useEffect(() => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    const update = () => {
      const next = measureRow(list, count);

      setLayout((current) => (sameLayout(current, next) ? current : next));
    };

    update();

    const observer = new ResizeObserver(update);

    observer.observe(list);

    return () => observer.disconnect();
  }, [count]);

  /* Move the row to the active stop (autoplay, indicators). */
  useEffect(() => {
    const list = listRef.current;

    if (!list || !layout.overflowing) {
      return;
    }

    const left = Math.min(activeIndex * layout.unit, layout.maxScroll);

    if (Math.abs(list.scrollLeft - left) <= LAYOUT_TOLERANCE_PX) {
      return;
    }

    if (typeof list.scrollTo === "function") {
      list.scrollTo({ behavior: reducedMotion ? "auto" : "smooth", left });
    } else {
      list.scrollLeft = left;
    }
  }, [activeIndex, layout, reducedMotion]);

  /* Follow manual scrolling (touch, wheel, keyboard focus) once it settles,
   * so the indicators and the next automatic step start from where the
   * visitor left the row. Waiting for the scroll to settle keeps our own
   * smooth scrolling from being mistaken for a manual one. */
  const handleScroll = useCallback(() => {
    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      const list = listRef.current;

      if (!list || !layout.overflowing || layout.unit <= 0) {
        return;
      }

      goTo(
        list.scrollLeft >= layout.maxScroll - LAYOUT_TOLERANCE_PX
          ? layout.stops - 1
          : Math.round(list.scrollLeft / layout.unit),
      );
    }, SCROLL_SETTLE_MS);
  }, [goTo, layout]);

  useEffect(() => () => window.clearTimeout(settleTimerRef.current), []);

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
        className="relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0"
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
          className="mt-1"
          count={layout.stops}
          groupLabel="Escolher criador em destaque"
          indicatorLabel={(index, total) =>
            `Criadores em destaque, posição ${index + 1} de ${total}`
          }
          manuallyPaused={manuallyPaused}
          onSelect={goTo}
          onTogglePaused={togglePaused}
          pauseLabel="Pausar rotação dos criadores em destaque"
          resumeLabel="Retomar rotação dos criadores em destaque"
        />
      ) : null}
    </section>
  );
}
