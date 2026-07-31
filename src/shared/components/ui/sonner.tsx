"use client";

import {
  CheckCircle2,
  CircleAlert,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import { Toaster as Sonner } from "sonner";

export function AppToaster() {
  return (
    <Sonner
      closeButton
      containerAriaLabel="Notificações"
      duration={5_000}
      gap={12}
      icons={{
        close: <X aria-hidden="true" className="size-4" />,
        error: <CircleAlert aria-hidden="true" className="size-5" />,
        info: <Info aria-hidden="true" className="size-5" />,
        loading: (
          <LoaderCircle
            aria-hidden="true"
            className="size-5 motion-safe:animate-spin"
          />
        ),
        success: <CheckCircle2 aria-hidden="true" className="size-5" />,
        warning: <TriangleAlert aria-hidden="true" className="size-5" />,
      }}
      mobileOffset={16}
      offset={24}
      position="top-center"
      swipeDirections={["top", "right"]}
      toastOptions={{
        closeButtonAriaLabel: "Fechar notificação",
        unstyled: true,
        classNames: {
          actionButton:
            "ml-auto rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-hover",
          closeButton:
            "absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
          content: "min-w-0 flex-1 space-y-0.5 pr-7",
          description: "text-sm leading-5 text-muted-foreground",
          error: "border-destructive/25 [&_[data-icon]]:text-destructive",
          icon: "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue",
          info: "border-brand-blue/25",
          loading: "border-brand-blue/25",
          success:
            "border-[#138a5b]/30 bg-[linear-gradient(135deg,#ffffff_0%,#f3fbf7_100%)] [&_[data-icon]]:bg-[#e7f7ef] [&_[data-icon]]:text-[#138a5b]",
          title: "text-sm font-bold tracking-[-0.01em] text-foreground",
          toast:
            "pointer-events-auto relative flex w-[min(25rem,calc(100vw-2rem))] items-start gap-3 overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-[0_20px_60px_rgb(8_8_8/0.18)]",
          warning: "border-amber-500/30 [&_[data-icon]]:text-amber-700",
        },
      }}
      visibleToasts={4}
    />
  );
}
