import {
  CheckCircle2,
  CircleAlert,
  Info,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";

export type ResultScreenTone = "error" | "info" | "processing" | "success";

export interface ResultScreenAction {
  href?: string;
  label: string;
  onClick?: () => void;
}

const toneIcons: Record<ResultScreenTone, LucideIcon> = {
  error: CircleAlert,
  info: Info,
  processing: LoaderCircle,
  success: CheckCircle2,
};

const toneIconClassNames: Record<ResultScreenTone, string> = {
  error: "bg-destructive/10 text-destructive",
  info: "bg-brand-blue-soft text-brand-blue",
  processing: "bg-brand-blue-soft text-brand-blue",
  success: "bg-[#e7f7ef] text-[#138a5b]",
};

function ResultScreenActionButton({ action }: { action: ResultScreenAction }) {
  if (action.href) {
    return (
      <Link className={cn(buttonVariants({ size: "lg" }))} href={action.href}>
        {action.label}
      </Link>
    );
  }

  return (
    <Button onClick={action.onClick} size="lg" type="button">
      {action.label}
    </Button>
  );
}

/**
 * The shared "here's what happened" screen for anything that isn't a form:
 * a submission's outcome, a processing step, or an `error.tsx` boundary.
 * Same card language as `AnalysisPending`, generalized to every tone.
 */
export function ResultScreen({
  description,
  details,
  primaryAction,
  secondaryAction,
  title,
  tone,
}: {
  description?: ReactNode;
  details?: ReactNode;
  primaryAction?: ResultScreenAction;
  secondaryAction?: ResultScreenAction;
  title: string;
  tone: ResultScreenTone;
}) {
  const Icon = toneIcons[tone];

  return (
    <main
      className="bg-brand-canvas relative flex min-h-[70vh] items-center justify-center overflow-hidden px-5 py-10"
      id="main-content"
      tabIndex={-1}
    >
      <div
        aria-hidden="true"
        className="bg-brand-blue/15 absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <Card className="relative w-full max-w-lg gap-0 overflow-hidden rounded-3xl py-0 shadow-[0_28px_80px_rgba(8,8,8,0.1)]">
        <CardHeader className="items-center gap-4 px-6 py-9 text-center sm:px-9">
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-300",
              toneIconClassNames[tone],
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                "size-7",
                tone === "processing" && "motion-safe:animate-spin",
              )}
            />
          </span>
          <CardTitle className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
            <h1>{title}</h1>
          </CardTitle>
          {description ? (
            <CardDescription className="max-w-md text-base leading-7">
              {description}
            </CardDescription>
          ) : null}
        </CardHeader>
        {details || primaryAction || secondaryAction ? (
          <CardContent className="space-y-6 px-6 py-7 sm:px-9">
            {details}
            {primaryAction || secondaryAction ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {secondaryAction ? (
                  secondaryAction.href ? (
                    <Link
                      className={cn(
                        buttonVariants({ size: "lg", variant: "outline" }),
                      )}
                      href={secondaryAction.href}
                    >
                      {secondaryAction.label}
                    </Link>
                  ) : (
                    <Button
                      onClick={secondaryAction.onClick}
                      size="lg"
                      type="button"
                      variant="outline"
                    >
                      {secondaryAction.label}
                    </Button>
                  )
                ) : null}
                {primaryAction ? (
                  <ResultScreenActionButton action={primaryAction} />
                ) : null}
              </div>
            ) : null}
          </CardContent>
        ) : null}
      </Card>
    </main>
  );
}
