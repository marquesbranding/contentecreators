import { Pause, Play } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";

/**
 * Pause/resume button plus one indicator per stop, shared by the
 * self-advancing sponsorship carousels. The pause button is only offered
 * when autoplay is possible (not under reduced motion); the indicators are
 * always there as the manual way to move.
 */
export function SponsorshipCarouselControls({
  activeIndex,
  canAutoplay,
  className,
  count,
  groupLabel,
  indicatorLabel,
  manuallyPaused,
  onSelect,
  onTogglePaused,
  pauseLabel,
  resumeLabel,
}: {
  activeIndex: number;
  canAutoplay: boolean;
  className?: string;
  count: number;
  groupLabel: string;
  indicatorLabel(index: number, count: number): string;
  manuallyPaused: boolean;
  onSelect(index: number): void;
  onTogglePaused(): void;
  pauseLabel: string;
  resumeLabel: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-center gap-3", className)}
      data-slot="sponsorship-carousel-controls"
    >
      {canAutoplay ? (
        <Button
          aria-label={manuallyPaused ? resumeLabel : pauseLabel}
          // 44 px touch target below the desktop breakpoint.
          className="size-11 lg:size-7"
          onClick={onTogglePaused}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          {manuallyPaused ? (
            <Play aria-hidden="true" />
          ) : (
            <Pause aria-hidden="true" />
          )}
        </Button>
      ) : null}
      <div
        aria-label={groupLabel}
        className="flex flex-wrap items-center justify-center gap-2"
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
    </div>
  );
}
