"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";

import { ScrollVelocityRow } from "@/registry/magicui/scroll-based-velocity";

import type { PublicShowcaseItemDto } from "../types/public-landing-showcase.types";
import {
  ShowcaseItemCard,
  showcaseItemKey,
  showcaseItemTestId,
} from "./showcase-item-card";

/**
 * Auto-advancing strip of the creators and companies enabled in the
 * backoffice. Only mounted once the list is long enough to fill the row
 * (`MIN_SHOWCASE_CAROUSEL_ITEMS`); a shorter one would loop the same two or
 * three cards past the visitor, which reads as duplicated content.
 *
 * Content that moves on its own for more than five seconds needs a way to stop
 * it (WCAG 2.2.2), so the row freezes while hovered or focused and offers an
 * explicit pause toggle. Reduced-motion users get a still row.
 */
export function LandingShowcaseCarousel({
  items,
}: {
  items: readonly PublicShowcaseItemDto[];
}) {
  const [pausedByUser, setPausedByUser] = useState(false);
  const [interacting, setInteracting] = useState(false);

  return (
    <div className="mt-8">
      <div
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setInteracting(false);
          }
        }}
        onFocus={() => setInteracting(true)}
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
      >
        <ScrollVelocityRow
          aria-label="Carrossel de creators e marcas em destaque"
          baseVelocity={1.5}
          className="py-2"
          direction={-1}
          paused={pausedByUser || interacting}
          role="region"
          scrollReactivity={false}
        >
          <ul className="flex items-stretch">
            {items.map((item) => (
              <li
                className="h-[21rem] w-[17.5rem] shrink-0 pr-5 whitespace-normal sm:w-[19.5rem]"
                data-testid={showcaseItemTestId(item)}
                key={showcaseItemKey(item)}
              >
                <ShowcaseItemCard item={item} />
              </li>
            ))}
          </ul>
        </ScrollVelocityRow>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-semibold text-black/70 transition-colors hover:border-black/40 hover:text-black focus-visible:ring-3 focus-visible:ring-black/40 focus-visible:outline-none"
          onClick={() => setPausedByUser((paused) => !paused)}
          type="button"
        >
          {pausedByUser ? (
            <Play aria-hidden="true" className="size-4" />
          ) : (
            <Pause aria-hidden="true" className="size-4" />
          )}
          {pausedByUser ? "Retomar carrossel" : "Pausar carrossel"}
        </button>
      </div>
    </div>
  );
}
