"use client";

import React, {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import type { MotionValue } from "motion/react";

import { cn } from "@/shared/lib/cn";

interface ScrollVelocityRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  baseVelocity?: number;
  direction?: 1 | -1;
  /**
   * Called (throttled to ~100ms) with the raw scroll offset and the width of
   * one content copy, whenever either changes — lets a caller derive which
   * item is currently centered (e.g. to highlight a matching dot).
   */
  onOffsetChange?(offsetPx: number, unitWidthPx: number): void;
  /** Freezes the row in place — for hover, focus, or an explicit pause control. */
  paused?: boolean;
  scrollReactivity?: boolean;
}

/** Imperative handle for driving the row's position from outside (e.g. dots). */
export interface ScrollVelocityRowHandle {
  /** Animates the row to an absolute offset, wrapping wire the same way autoplay does. */
  scrollToOffset(offsetPx: number): void;
}

export const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const ScrollVelocityContext = React.createContext<MotionValue<number> | null>(
  null,
);

export function ScrollVelocityContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, (v) => {
    const sign = v < 0 ? -1 : 1;
    const magnitude = Math.min(5, (Math.abs(v) / 1000) * 5);
    return sign * magnitude;
  });

  return (
    <ScrollVelocityContext.Provider value={velocityFactor}>
      <div
        className={cn("relative w-full", className)}
        {...props}
        data-slot="scroll-velocity-container"
      >
        {children}
      </div>
    </ScrollVelocityContext.Provider>
  );
}

export const ScrollVelocityRow = forwardRef<
  ScrollVelocityRowHandle,
  ScrollVelocityRowProps
>(function ScrollVelocityRow(props, ref) {
  const sharedVelocityFactor = useContext(ScrollVelocityContext);
  if (sharedVelocityFactor) {
    return (
      <ScrollVelocityRowImpl
        {...props}
        ref={ref}
        velocityFactor={sharedVelocityFactor}
      />
    );
  }
  return <ScrollVelocityRowLocal {...props} ref={ref} />;
});

interface ScrollVelocityRowImplProps extends ScrollVelocityRowProps {
  velocityFactor: MotionValue<number>;
}

const ScrollVelocityRowImpl = forwardRef<
  ScrollVelocityRowHandle,
  ScrollVelocityRowImplProps
>(function ScrollVelocityRowImpl(
  {
    children,
    baseVelocity = 5,
    direction = 1,
    className,
    onOffsetChange,
    velocityFactor,
    paused = false,
    scrollReactivity = true,
    ...props
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const [numCopies, setNumCopies] = useState(1);

  const baseX = useMotionValue(0);
  const baseDirectionRef = useRef<number>(direction >= 0 ? 1 : -1);
  const currentDirectionRef = useRef<number>(direction >= 0 ? 1 : -1);
  const unitWidth = useMotionValue(0);

  const isInViewRef = useRef(true);
  const isPageVisibleRef = useRef(true);
  const prefersReducedMotionRef = useRef(false);
  const pausedRef = useRef(paused);
  const isAnimatingToTargetRef = useRef(false);
  const onOffsetChangeRef = useRef(onOffsetChange);
  const lastReportedAtRef = useRef(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onOffsetChangeRef.current = onOffsetChange;
  }, [onOffsetChange]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToOffset(offsetPx) {
        isAnimatingToTargetRef.current = true;
        animate(baseX, offsetPx, {
          damping: 32,
          onComplete: () => {
            isAnimatingToTargetRef.current = false;
          },
          stiffness: 260,
          type: "spring",
        });
      },
    }),
    [baseX],
  );

  useEffect(() => {
    const container = containerRef.current;
    const block = blockRef.current;
    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let mq: MediaQueryList | null = null;
    const handleVisibility = () => {
      isPageVisibleRef.current = document.visibilityState === "visible";
    };
    const handlePRM = () => {
      if (mq) {
        prefersReducedMotionRef.current = mq.matches;
      }
    };

    if (container && block) {
      const updateSizes = () => {
        const cw = container.offsetWidth || 0;
        const bw = block.scrollWidth || 0;
        unitWidth.set(bw);
        // One copy past the container keeps the wrap seamless; more than that
        // only puts the same content on screen twice over.
        const nextCopies = bw > 0 ? Math.max(2, Math.ceil(cw / bw) + 1) : 1;
        setNumCopies((prev) => (prev === nextCopies ? prev : nextCopies));
      };

      updateSizes();

      ro = new ResizeObserver(updateSizes);
      ro.observe(container);
      ro.observe(block);

      io = new IntersectionObserver(([entry]) => {
        isInViewRef.current = entry.isIntersecting;
      });
      io.observe(container);

      document.addEventListener("visibilitychange", handleVisibility, {
        passive: true,
      });
      handleVisibility();

      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", handlePRM);
      handlePRM();
    }

    return () => {
      if (ro) {
        ro.disconnect();
      }
      if (io) {
        io.disconnect();
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      if (mq) {
        mq.removeEventListener("change", handlePRM);
      }
    };
  }, [children, unitWidth]);

  const x = useTransform([baseX, unitWidth], ([v, bw]) => {
    const width = Number(bw) || 1;
    const offset = Number(v) || 0;
    return `${-wrap(0, width, offset)}px`;
  });

  useAnimationFrame((_, delta) => {
    if (onOffsetChangeRef.current) {
      const now = performance.now();
      if (now - lastReportedAtRef.current >= 100) {
        lastReportedAtRef.current = now;
        onOffsetChangeRef.current(baseX.get(), unitWidth.get() || 0);
      }
    }

    if (
      pausedRef.current ||
      isAnimatingToTargetRef.current ||
      !isInViewRef.current ||
      !isPageVisibleRef.current ||
      prefersReducedMotionRef.current
    )
      return;
    const dt = delta / 1000;
    const vf = scrollReactivity ? velocityFactor.get() : 0;
    const absVf = Math.min(5, Math.abs(vf));
    const speedMultiplier = 1 + absVf;

    if (absVf > 0.1) {
      const scrollDirection = vf >= 0 ? 1 : -1;
      currentDirectionRef.current = baseDirectionRef.current * scrollDirection;
    }

    const bw = unitWidth.get() || 0;
    if (bw <= 0) return;
    const pixelsPerSecond = (bw * baseVelocity) / 100;
    const moveBy =
      currentDirectionRef.current * pixelsPerSecond * speedMultiplier * dt;
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div
      ref={containerRef}
      className={cn("w-full overflow-hidden whitespace-nowrap", className)}
      {...props}
      data-slot="scroll-velocity-row"
    >
      <motion.div
        className="inline-flex transform-gpu items-center will-change-transform select-none"
        style={{ x }}
      >
        {Array.from({ length: numCopies }).map((_, i) => (
          <div
            key={i}
            ref={i === 0 ? blockRef : null}
            aria-hidden={i !== 0}
            className="inline-flex shrink-0 items-center"
          >
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
});

const ScrollVelocityRowLocal = forwardRef<
  ScrollVelocityRowHandle,
  ScrollVelocityRowProps
>(function ScrollVelocityRowLocal(props, ref) {
  const { scrollY } = useScroll();
  const localVelocity = useVelocity(scrollY);
  const localSmoothVelocity = useSpring(localVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const localVelocityFactor = useTransform(localSmoothVelocity, (v) => {
    const sign = v < 0 ? -1 : 1;
    const magnitude = Math.min(5, (Math.abs(v) / 1000) * 5);
    return sign * magnitude;
  });
  return (
    <ScrollVelocityRowImpl
      {...props}
      ref={ref}
      velocityFactor={localVelocityFactor}
    />
  );
});
