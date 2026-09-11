"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";

import { useBackofficeAccess } from "./backoffice-access-context.client";

/**
 * Lets an administrator leave a profile-creation step for the backoffice, which
 * never requires a product profile. An admin may only want to administer the
 * platform, so onboarding must not trap them. Renders nothing for anyone else.
 */
export function BackofficeAccessLink({ className }: { className?: string }) {
  const hasBackofficeAccess = useBackofficeAccess();

  if (!hasBackofficeAccess) {
    return null;
  }

  return (
    <Link
      aria-label="Acessar backoffice"
      className={cn(
        buttonVariants({ size: "sm", variant: "outline" }),
        "rounded-full",
        className,
      )}
      href="/backoffice"
    >
      <LayoutDashboard aria-hidden="true" />
      <span className="hidden sm:inline">Acessar backoffice</span>
    </Link>
  );
}
