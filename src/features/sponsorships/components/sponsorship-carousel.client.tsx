"use client";

import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

import {
  getSafeSponsorshipExternalHref,
  isSponsorshipCreativeVisible,
  type SponsorshipCreativeViewModel,
  SponsorshipLabels,
  SponsorshipMedia,
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
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

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
          const safeHref = creative.link
            ? getSafeSponsorshipExternalHref(creative.link.href)
            : null;

          return (
            <li
              aria-current={
                index === normalizedActiveIndex ? "true" : undefined
              }
              className="min-w-[min(18rem,82vw)] snap-start sm:min-w-80"
              key={creative.id}
            >
              <Card className="h-full gap-0 overflow-hidden rounded-2xl border bg-white py-0 shadow-sm">
                {creative.media ? (
                  <SponsorshipMedia
                    className="aspect-[16/8] border-b"
                    media={creative.media}
                  />
                ) : null}
                <CardHeader className="gap-3 px-5 pt-5">
                  <SponsorshipLabels
                    advertiserLabel={creative.advertiserLabel}
                    previewMode={creative.previewMode}
                  />
                  <CardTitle>
                    <h3 className="text-xl font-bold">{creative.title}</h3>
                  </CardTitle>
                  {creative.body ? (
                    <CardDescription className="leading-6">
                      {creative.body}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                {creative.link && safeHref ? (
                  <CardContent className="mt-auto px-5 pb-5">
                    <a
                      className={buttonVariants({
                        className: "min-h-12 w-full",
                        size: "lg",
                      })}
                      href={safeHref}
                      ref={(element) => {
                        linkRefs.current[index] = element;
                      }}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {creative.link.label}
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </CardContent>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
