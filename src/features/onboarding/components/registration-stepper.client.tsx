"use client";

import { Check } from "lucide-react";

import { cn } from "@/shared/lib/cn";

export interface RegistrationStep {
  label: string;
}

export function RegistrationStepper({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: RegistrationStep[];
}) {
  const currentLabel = steps[currentStep - 1]?.label;

  return (
    <>
      <p aria-live="polite" className="text-muted-foreground mb-2 text-xs">
        Etapa {String(currentStep).padStart(2, "0")} de{" "}
        {String(steps.length).padStart(2, "0")}
        {currentLabel ? ` · ${currentLabel}` : ""}
      </p>
      <ol
        className={
          steps.length > 4
            ? "grid grid-cols-3 gap-x-2 gap-y-4 sm:flex sm:items-start"
            : "flex items-start"
        }
        role="list"
      >
        {steps.map((step, index) => {
          const n = index + 1;
          const done = n < currentStep;
          const active = n === currentStep;

          return (
            <li
              className={cn(
                "flex items-center",
                steps.length > 4 && "justify-center sm:justify-start",
                n < steps.length ? "flex-1" : "flex-none",
              )}
              key={step.label}
            >
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border text-sm font-bold transition-all",
                    active &&
                      "border-brand-blue bg-brand-blue ring-brand-blue/20 scale-105 text-white ring-4",
                    done &&
                      "border-brand-blue bg-brand-blue/10 text-brand-blue",
                    !done &&
                      !active &&
                      "border-border text-muted-foreground bg-white",
                  )}
                >
                  {done ? (
                    <Check aria-hidden="true" className="size-3.5" />
                  ) : (
                    String(n).padStart(2, "0")
                  )}
                </span>
                <span
                  className={cn(
                    "max-w-20 text-center text-[11px] sm:whitespace-nowrap",
                    active
                      ? "text-brand-blue font-bold"
                      : done
                        ? "text-muted-foreground font-semibold"
                        : "text-muted-foreground font-semibold",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {n < steps.length ? (
                <div
                  className={cn(
                    "mx-1.5 mb-4 h-0.5 flex-1 rounded-full",
                    steps.length > 4 && "hidden sm:block",
                    done ? "bg-brand-blue" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
