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
  variant = "inline",
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
  /**
   * `inline` (default) renders arrows + dots in normal flow below the slides.
   * `overlay` is for sitting absolutely inside the banner: white dots only,
   * no arrows; the dots are the way to move between banners.
   */
  variant?: "inline" | "overlay";
}) {
  const overlay = variant === "overlay";

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 sm:gap-2",
        className,
      )}
      data-slot="sponsorship-carousel-controls"
      data-variant={variant}
    >
      {overlay ? null : (
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
      )}
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
                overlay
                  ? active
                    ? "w-6 bg-white shadow-sm"
                    : "w-2.5 bg-white/50 shadow-sm hover:bg-white/80"
                  : active
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
      {overlay ? null : (
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
      )}
    </div>
  );
}
