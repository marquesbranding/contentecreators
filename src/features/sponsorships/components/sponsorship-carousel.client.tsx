"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { SponsorshipCatalogCard } from "./sponsorship-catalog-card";

import {
  isSponsorshipCreativeVisible,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";

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
  const [activeIndex, setActiveIndex] = useState(0);
  const linkRefs = useRef<Array<HTMLLIElement | null>>([]);

  if (visibleCreatives.length === 0) {
    return null;
  }

  const normalizedActiveIndex = Math.min(
    activeIndex,
    visibleCreatives.length - 1,
  );

  function showPlacement(nextIndex: number) {
    const boundedIndex = Math.max(
      0,
      Math.min(nextIndex, visibleCreatives.length - 1),
    );

    setActiveIndex(boundedIndex);
    linkRefs.current[boundedIndex]?.focus();
    linkRefs.current[boundedIndex]?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }

  return (
    <section
      aria-label={label}
      aria-roledescription="carrossel"
      className="space-y-4"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          showPlacement(normalizedActiveIndex - 1);
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          showPlacement(normalizedActiveIndex + 1);
        }
      }}
      role="region"
      tabIndex={0}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.02em]">{label}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Use os controles ou as setas do teclado para navegar.
          </p>
        </div>
        <div aria-label="Controles do carrossel" className="flex gap-2">
          <Button
            aria-label="Patrocínio anterior"
            disabled={normalizedActiveIndex === 0}
            onClick={() => showPlacement(normalizedActiveIndex - 1)}
            size="icon-lg"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            aria-label="Próximo patrocínio"
            disabled={normalizedActiveIndex === visibleCreatives.length - 1}
            onClick={() => showPlacement(normalizedActiveIndex + 1)}
            size="icon-lg"
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        Patrocínio {normalizedActiveIndex + 1} de {visibleCreatives.length}:{" "}
        {visibleCreatives[normalizedActiveIndex]?.title}
      </p>

      <ul
        aria-label="Lista de patrocínios"
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0"
      >
        {visibleCreatives.map((creative, index) => {
          return (
            <li
              aria-current={
                index === normalizedActiveIndex ? "true" : undefined
              }
              className="min-w-0 shrink-0 basis-full snap-start sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)]"
              tabIndex={-1}
              ref={(element) => {
                linkRefs.current[index] = element;
              }}
              key={creative.id}
            >
              <SponsorshipCatalogCard creative={creative} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
