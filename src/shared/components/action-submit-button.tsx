"use client";

import type { ComponentProps } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";

type ButtonProps = ComponentProps<typeof Button>;

interface ActionSubmitButtonProps extends Omit<ButtonProps, "type"> {
  compactPending?: boolean;
  idleIcon?: React.ReactNode;
  pending: boolean;
  pendingLabel: string;
}

export function ActionSubmitButton({
  children,
  className,
  compactPending = false,
  disabled,
  idleIcon,
  pending,
  pendingLabel,
  variant = "default",
  ...props
}: ActionSubmitButtonProps) {
  return (
    <Button
      aria-busy={pending}
      aria-label={pending ? pendingLabel : undefined}
      className={cn("relative overflow-hidden", className)}
      data-submit-pending={pending ? "true" : "false"}
      disabled={pending || disabled}
      type="submit"
      variant={variant}
      {...props}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              "submit-brand-pulse inline-flex shrink-0 overflow-hidden rounded-full",
              compactPending ? "size-6" : "size-8",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              height={379}
              src="/brand/official/contente-creators-mascot.png"
              width={369}
            />
          </span>
          <span className={compactPending ? "sr-only" : undefined}>
            {pendingLabel}
          </span>
        </span>
      ) : (
        <>
          {idleIcon}
          {children}
        </>
      )}
    </Button>
  );
}
