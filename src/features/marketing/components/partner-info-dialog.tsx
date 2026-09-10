import { ArrowUpRight } from "lucide-react";
import type { ComponentType } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

export interface PartnerInfoFact {
  description: string;
  icon: ComponentType<{ "aria-hidden"?: boolean | "true"; className?: string }>;
  title: string;
}

export interface PartnerInfoDialogProps {
  ctaHref: string;
  ctaLabel: string;
  description: string;
  facts: readonly PartnerInfoFact[];
  footnote: string;
  /** Rendered height class for the trigger logo — the marks differ in aspect ratio. */
  logoClassName?: string;
  logoHeight: number;
  logoSrc: string;
  logoWidth: number;
  title: string;
  triggerLabel: string;
}

/**
 * The footer partner seal: a logo that opens an institutional dialog. Shared by
 * the Vevox and Marques Branding credits so the two stay identical in
 * behaviour and accessibility instead of drifting as duplicated markup.
 */
export function PartnerInfoDialog({
  ctaHref,
  ctaLabel,
  description,
  facts,
  footnote,
  logoClassName = "h-5 w-auto",
  logoHeight,
  logoSrc,
  logoWidth,
  title,
  triggerLabel,
}: PartnerInfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            aria-label={triggerLabel}
            className="inline-flex min-h-8 items-center justify-center rounded-md px-2 py-1 transition-colors hover:bg-white/[0.06] focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            type="button"
          />
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className={`${logoClassName} opacity-80 transition-opacity hover:opacity-100`}
          decoding="async"
          height={logoHeight}
          loading="lazy"
          src={logoSrc}
          width={logoWidth}
        />
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-white/10 bg-[#111114] p-0 text-white sm:max-w-lg">
        <DialogHeader className="gap-3 p-6 pr-12 pb-4">
          <DialogTitle className="text-2xl font-semibold tracking-normal text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-white/70">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 px-6 pb-5">
          {facts.map((fact) => (
            <div
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"
              key={fact.title}
            >
              <div className="flex size-8 items-center justify-center rounded-md bg-white/[0.08] text-white/80">
                <fact.icon aria-hidden="true" className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">
                  {fact.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/[0.62]">
                  {fact.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 bg-black/20 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="max-w-[15rem] text-xs leading-5 text-white/[0.55]">
            {footnote}
          </p>
          <a
            className="inline-flex min-h-10 min-w-[11rem] shrink-0 items-center justify-center gap-1.5 rounded-md border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:border-white/[0.35] hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
            href={ctaHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            {ctaLabel}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
