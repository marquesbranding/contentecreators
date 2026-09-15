"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ScrollVelocityRow,
  wrap,
  type ScrollVelocityRowHandle,
} from "@/registry/magicui/scroll-based-velocity";
import { cn } from "@/shared/lib/cn";

import type { PublicShowcaseItemDto } from "../types/public-landing-showcase.types";
import {
  ShowcaseItemCard,
  showcaseItemKey,
  showcaseItemTestId,
} from "./showcase-item-card";

/** Past this many items, dots represent a page of four rather than one each. */
const MAX_INDIVIDUAL_DOTS = 24;
const ITEMS_PER_GROUPED_DOT = 4;

function useCardWidth() {
  const [node, setNode] = useState<HTMLLIElement | null>(null);
  const [width, setWidth] = useState(0);

  const ref = useCallback((element: HTMLLIElement | null) => {
    setNode(element);
  }, []);

  useEffect(() => {
    if (!node) {
      return;
    }

    const measure = () => setWidth(node.getBoundingClientRect().width);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, [node]);

  return [width, ref] as const;
}

/**
 * Auto-advancing strip of the creators and companies enabled in the
 * backoffice. Only mounted once the list is long enough to fill the row
 * (`MIN_SHOWCASE_CAROUSEL_ITEMS`); a shorter one would loop the same two or
 * three cards past the visitor, which reads as duplicated content.
 *
 * Content that moves on its own for more than five seconds needs a way to
 * stop it (WCAG 2.2.2): the row freezes on hover, on keyboard focus, and
 * while a finger or the mouse button holds it down, and resumes as soon as
 * that ends. The dots below double as a manual, always-available way to
 * jump to any item. Reduced-motion visitors get a still row from the start,
 * with the dots as their only way to move through it.
 */
export function LandingShowcaseCarousel({
  items,
}: {
  items: readonly PublicShowcaseItemDto[];
}) {
  const [hovering, setHovering] = useState(false);
  const [holding, setHolding] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const paused = hovering || holding || focused;

  const rowRef = useRef<ScrollVelocityRowHandle>(null);
  const [cardWidth, firstItemRef] = useCardWidth();
  const lastOffsetRef = useRef(0);
  const lastUnitWidthRef = useRef(0);

  const handleOffsetChange = useCallback(
    (offsetPx: number, unitWidthPx: number) => {
      lastOffsetRef.current = offsetPx;
      lastUnitWidthRef.current = unitWidthPx;

      if (cardWidth <= 0 || unitWidthPx <= 0 || items.length === 0) {
        return;
      }

      const wrappedOffset = wrap(0, unitWidthPx, offsetPx);
      const itemIndex = Math.floor(wrappedOffset / cardWidth) % items.length;

      setActiveIndex(itemIndex);
    },
    [cardWidth, items.length],
  );

  const groupsIntoDots = items.length > MAX_INDIVIDUAL_DOTS;
  const dotCount = groupsIntoDots
    ? Math.ceil(items.length / ITEMS_PER_GROUPED_DOT)
    : items.length;
  const itemsPerDot = groupsIntoDots ? ITEMS_PER_GROUPED_DOT : 1;
  const activeDot = Math.floor(activeIndex / itemsPerDot);

  function goToDot(dotIndex: number) {
    if (cardWidth <= 0) {
      return;
    }

    const unitWidthPx = lastUnitWidthRef.current || cardWidth * items.length;
    const targetItemIndex = dotIndex * itemsPerDot;
    const currentWrapped = wrap(0, unitWidthPx, lastOffsetRef.current);
    const targetWrapped = wrap(0, unitWidthPx, targetItemIndex * cardWidth);
    const targetOffset = lastOffsetRef.current - currentWrapped + targetWrapped;

    rowRef.current?.scrollToOffset(targetOffset);
  }

  return (
    <div className="mt-8">
      <div
        data-testid="carousel-interaction-zone"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setFocused(false);
          }
        }}
        onFocus={() => setFocused(true)}
        onPointerCancel={() => setHolding(false)}
        onPointerDown={() => setHolding(true)}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            setHovering(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") {
            setHovering(false);
          }
          setHolding(false);
        }}
        onPointerUp={() => setHolding(false)}
        style={{ touchAction: "pan-y" }}
      >
        <ScrollVelocityRow
          aria-label="Carrossel de creators e marcas em destaque"
          baseVelocity={1.5}
          className="py-2"
          direction={-1}
          onOffsetChange={handleOffsetChange}
          paused={paused}
          ref={rowRef}
          role="region"
          scrollReactivity={false}
        >
          <ul className="flex items-stretch">
            {items.map((item, index) => (
              <li
                className="h-[21rem] w-[17.5rem] shrink-0 pr-5 whitespace-normal sm:w-[19.5rem]"
                data-testid={showcaseItemTestId(item)}
                key={showcaseItemKey(item)}
                ref={index === 0 ? firstItemRef : undefined}
              >
                <ShowcaseItemCard item={item} />
              </li>
            ))}
          </ul>
        </ScrollVelocityRow>
      </div>
      {dotCount > 1 ? (
        <div
          aria-label="Escolher destaque"
          className="mt-5 flex flex-wrap justify-center gap-2"
          role="tablist"
        >
          {Array.from({ length: dotCount }, (_, dotIndex) => (
            <button
              aria-label={`Ir para ${dotIndex + 1} de ${dotCount}`}
              aria-selected={dotIndex === activeDot}
              className={cn(
                "relative h-2.5 rounded-full transition-all before:absolute before:inset-[-7px] before:content-['']",
                dotIndex === activeDot
                  ? "w-6 bg-black"
                  : "w-2.5 bg-black/20 hover:bg-black/40",
              )}
              key={dotIndex}
              onClick={() => goToDot(dotIndex)}
              role="tab"
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
