import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";

/**
 * The one control bar of every self-advancing sponsorship carousel, placed
 * below the slides and centered:
 *
 *     [‹]  ● ● ━━ ●  [›]  [⏸]
 *
 * Previous/next arrows flank the indicator dots; a small, muted pause button
 * closes the row (WCAG 2.2.2). The pause button is only offered when autoplay
 * is possible (not under reduced motion); arrows and dots are always there as
 * the manual way to move. Buttons are 44 px touch targets below `lg`.
 */
export function SponsorshipCarouselControls({
  activeIndex,
  canAutoplay,
  className,
  count,
  groupLabel,
  indicatorLabel,
  manuallyPaused,
  nextLabel,
  onNext,
  onPrevious,
  onSelect,
  onTogglePaused,
  pauseLabel,
  previousLabel,
  resumeLabel,
}: {
  activeIndex: number;
  canAutoplay: boolean;
  className?: string;
  count: number;
  groupLabel: string;
  indicatorLabel(index: number, count: number): string;
  manuallyPaused: boolean;
  nextLabel: string;
  onNext(): void;
  onPrevious(): void;
  onSelect(index: number): void;
  onTogglePaused(): void;
  pauseLabel: string;
  previousLabel: string;
  resumeLabel: string;
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
      {canAutoplay ? (
        <Button
          aria-label={manuallyPaused ? resumeLabel : pauseLabel}
          className="text-muted-foreground size-11 lg:size-7"
          onClick={onTogglePaused}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          {manuallyPaused ? (
            <Play aria-hidden="true" />
          ) : (
            <Pause aria-hidden="true" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
