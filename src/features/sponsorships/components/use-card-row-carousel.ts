"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  CAROUSEL_AUTO_ADVANCE_MS,
  useAutoAdvance,
} from "@/shared/hooks/use-auto-advance";

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

  // Prefer the real distance between two cards: the list's own padding (the
  // mobile edge bleed) is part of `scrollWidth` and would skew an average.
  const [first, second] = Array.from(list.children) as HTMLElement[];
  const measuredUnit =
    first && second ? second.offsetLeft - first.offsetLeft : 0;
  const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
  const unit =
    measuredUnit > LAYOUT_TOLERANCE_PX
      ? measuredUnit
      : (list.scrollWidth + gap) / count;

  return {
    maxScroll,
    overflowing: true,
    stops: Math.min(count, Math.ceil(maxScroll / unit - 0.01) + 1),
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
 * Shared engine of the card-style sponsorship carousels (featured creators
 * row, catalog carousel): a horizontal scroll-snap list that shows 1/2/3/4
 * cards per breakpoint.
 *
 * While every card fits, the row is static (`overflowing` false): no motion,
 * no controls. Once the cards overflow the available width it advances one
 * card every 5 seconds, wraps to the start and follows the pause rules of
 * `useAutoAdvance` (mouse hover, touch press-and-hold, keyboard focus, hidden tab, reduced
 * motion). Overflow is measured on the client with a `ResizeObserver`; the
 * server and the first client render are always the static layout, so there
 * is nothing to mismatch on hydration.
 */
export function useCardRowCarousel({ count }: { count: number }) {
  const listRef = useRef<HTMLUListElement>(null);
  const settleTimerRef = useRef<number | undefined>(undefined);
  const [layout, setLayout] = useState<RowLayout>(STATIC_LAYOUT);

  const advance = useAutoAdvance({
    count: layout.stops,
    enabled: layout.overflowing,
    intervalMs: CAROUSEL_AUTO_ADVANCE_MS,
  });
  const { activeIndex, goTo, reducedMotion } = advance;

  // Layout effect: measure before the first paint so the controls do not
  // pop in a frame later and push the page down.
  useLayoutEffect(() => {
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

  /* Move the row to the active stop (autoplay, arrows, indicators). */
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

  return { ...advance, handleScroll, layout, listRef };
}
