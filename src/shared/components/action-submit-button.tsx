"use client";

import type { ComponentProps } from "react";

import type { BrandLogoVariant } from "@/shared/components/brand-logo";
import { BrandLogo } from "@/shared/components/brand-logo";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";

type ButtonProps = ComponentProps<typeof Button>;

interface ActionSubmitButtonProps extends Omit<ButtonProps, "type"> {
  compactPending?: boolean;
  idleIcon?: React.ReactNode;
  pending: boolean;
  pendingLabel: string;
  pendingLogoVariant?: BrandLogoVariant;
}

function resolvePendingLogoVariant(
  variant: ButtonProps["variant"],
): BrandLogoVariant {
  return variant === "outline" ||
    variant === "secondary" ||
    variant === "ghost" ||
    variant === "link"
    ? "blue"
    : "white";
}

export function ActionSubmitButton({
  children,
  className,
  compactPending = false,
  disabled,
  idleIcon,
  pending,
  pendingLabel,
  pendingLogoVariant,
  variant = "default",
  ...props
}: ActionSubmitButtonProps) {
  const logoVariant = pendingLogoVariant ?? resolvePendingLogoVariant(variant);

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
            className="submit-brand-pulse inline-flex rounded-md"
          >
            <BrandLogo
              background="transparent"
              className={compactPending ? "w-8" : "w-[4.75rem] sm:w-20"}
              variant={logoVariant}
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
