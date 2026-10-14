"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

/** Every public carousel moves to the next slide this often. */
export const CAROUSEL_AUTO_ADVANCE_MS = 5_000;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);

  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Server and hydration render with motion allowed; the client then corrects it. */
function getReducedMotionServerSnapshot() {
  return false;
}

/** Whether the visitor asked the OS/browser for less motion. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

function isKeyboardFocus(target: EventTarget) {
  try {
    return target instanceof Element ? target.matches(":focus-visible") : true;
  } catch {
    // Engines without `:focus-visible`: treat every focus as keyboard focus.
    return true;
  }
}

/** Arrow keys must not hijack typing or native widgets inside the region. */
function isArrowKeyTarget(target: EventTarget) {
  return !(
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
  );
}

export interface UseAutoAdvanceOptions {
  /** Number of slides/stops. Autoplay needs at least two. */
  count: number;
  /** Time each slide stays before advancing, in milliseconds. */
  intervalMs: number;
  /** Extra gate, e.g. "only while the row overflows". Defaults to true. */
  enabled?: boolean;
}

/**
 * Timer and pause rules shared by every self-advancing carousel.
 *
 * Content that moves on its own for more than five seconds must be
 * stoppable (WCAG 2.2.2), so autoplay holds while the pointer is over the
 * region, while keyboard focus is inside it and while the tab is hidden, and
 * the caller gets a manual pause toggle. Visitors with
 * `prefers-reduced-motion: reduce` never get autoplay at all (`canAutoplay`
 * is false), and navigate with `goTo`/`next`/`previous` only.
 *
 * Spread `interactionProps` on the region that holds the slides and its
 * controls; it also wires ArrowLeft/ArrowRight (focus inside the region) to
 * `previous`/`next`. The timer restarts after every slide change, so a manual jump
 * always gets a full interval before the next automatic one.
 */
export function useAutoAdvance({
  count,
  intervalMs,
  enabled = true,
}: UseAutoAdvanceOptions) {
  const [index, setIndex] = useState(0);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const activeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const canAutoplay = enabled && count > 1 && !reducedMotion;
  const isPlaying =
    canAutoplay && !manuallyPaused && !hovering && !focused && !pageHidden;

  useEffect(() => {
    const syncVisibility = () =>
      setPageHidden(document.visibilityState === "hidden");

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);

    return () =>
      document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIndex((current) => (Math.min(current, count - 1) + 1) % count);
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [activeIndex, count, intervalMs, isPlaying]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (count > 0) {
        setIndex(Math.max(0, Math.min(nextIndex, count - 1)));
      }
    },
    [count],
  );
  const next = useCallback(() => {
    if (count > 0) {
      setIndex((current) => (Math.min(current, count - 1) + 1) % count);
    }
  }, [count]);
  const previous = useCallback(() => {
    if (count > 0) {
      setIndex((current) => (Math.min(current, count - 1) - 1 + count) % count);
    }
  }, [count]);

  const togglePaused = useCallback(() => {
    if (manuallyPaused) {
      // An explicit "resume" outranks the pointer/focus that is still
      // resting on the pause button itself.
      setHovering(false);
      setFocused(false);
    }

    setManuallyPaused(!manuallyPaused);
  }, [manuallyPaused]);

  const interactionProps = useMemo(
    () => ({
      onBlur(event: FocusEvent<HTMLElement>) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      },
      onFocus(event: FocusEvent<HTMLElement>) {
        // Mouse clicks on controls also focus them; only keyboard focus
        // should freeze the slides.
        if (isKeyboardFocus(event.target)) {
          setFocused(true);
        }
      },
      onKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.defaultPrevented ||
          !isArrowKeyTarget(event.target)
        ) {
          return;
        }

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          previous();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          next();
        }
      },
      onPointerEnter(event: PointerEvent<HTMLElement>) {
        if (event.pointerType !== "touch") {
          setHovering(true);
        }
      },
      onPointerLeave() {
        setHovering(false);
      },
    }),
    [next, previous],
  );

  return {
    activeIndex,
    canAutoplay,
    goTo,
    interactionProps,
    isPlaying,
    manuallyPaused,
    next,
    previous,
    reducedMotion,
    togglePaused,
  };
}
