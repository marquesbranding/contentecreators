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
  return (
    <ol className="flex items-start" role="list">
      {steps.map((step, index) => {
        const n = index + 1;
        const done = n < currentStep;
        const active = n === currentStep;

        return (
          <li
            className={cn(
              "flex items-center",
              n < steps.length ? "flex-1" : "flex-none",
            )}
            key={step.label}
          >
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-sm font-bold",
                  done && "border-brand-blue bg-brand-blue text-white",
                  active && "border-brand-blue text-brand-blue bg-white",
                  !done && !active && "border-border text-muted-foreground bg-white",
                )}
              >
                {done ? <Check aria-hidden="true" className="size-3.5" /> : n}
              </span>
              <span
                className={cn(
                  "text-[11px] font-semibold whitespace-nowrap",
                  done || active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {n < steps.length ? (
              <div
                className={cn(
                  "mx-1.5 mb-4 h-0.5 flex-1 rounded-full",
                  done ? "bg-brand-blue" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
