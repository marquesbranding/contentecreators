import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";

/**
 * The one control bar of every self-advancing sponsorship carousel, placed
 * below the slides and centered:
 *
 *     [‹]  ● ● ━━ ●  [›]
 *
 * Previous/next arrows flank the indicator dots; they are the manual way to
 * move, also under reduced motion. There is no pause button: the carousel
 * pauses by itself on hover, press-and-hold and keyboard focus (see
 * `useAutoAdvance`). Buttons are 44 px touch targets below `lg`.
 */
export function SponsorshipCarouselControls({
  activeIndex,
  className,
  count,
  groupLabel,
  indicatorLabel,
  nextLabel,
  onNext,
  onPrevious,
  onSelect,
  previousLabel,
}: {
  activeIndex: number;
  className?: string;
  count: number;
  groupLabel: string;
  indicatorLabel(index: number, count: number): string;
  nextLabel: string;
  onNext(): void;
  onPrevious(): void;
  onSelect(index: number): void;
  previousLabel: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 sm:gap-2",
        className,
      )}
      data-slot="sponsorship-carousel-controls"
    >
      <Button
        aria-label={previousLabel}
        className="size-11 lg:size-8"
        onClick={onPrevious}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <div
        aria-label={groupLabel}
        className="flex flex-wrap items-center justify-center gap-2 px-1 sm:px-2"
        role="group"
      >
        {Array.from({ length: count }, (_, index) => {
          const active = index === activeIndex;

          return (
            <button
              aria-current={active ? "true" : undefined}
              aria-label={indicatorLabel(index, count)}
              className={cn(
                "focus-visible:ring-ring/50 relative h-2.5 rounded-full outline-none before:absolute before:inset-[-7px] before:content-[''] focus-visible:ring-3 motion-safe:transition-all",
                active
                  ? "bg-foreground w-6"
                  : "bg-foreground/20 hover:bg-foreground/40 w-2.5",
              )}
              key={index}
              onClick={() => onSelect(index)}
              type="button"
            />
          );
        })}
      </div>
      <Button
        aria-label={nextLabel}
        className="size-11 lg:size-8"
        onClick={onNext}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
