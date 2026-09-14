import type { ReactNode } from "react";

import { SignedImage } from "@/shared/components/signed-image";
import { cn } from "@/shared/lib/cn";

const sizeClassNames = {
  card: "size-16 rounded-2xl",
  header: "size-18 sm:size-20 rounded-3xl",
} as const;

/**
 * The single "photo in a frame" look used everywhere a profile avatar or
 * company logo is shown — landing, catalog, detail pages and the onboarding
 * preview all render the exact same crop so what a user sees while signing
 * up matches what everyone else sees of them later.
 */
export function ProfileAvatarFrame({
  alt,
  children,
  className,
  fallback,
  size = "card",
  src,
}: {
  alt: string;
  /** Extra overlay content (e.g. a hover-to-upload affordance) painted on top. */
  children?: ReactNode;
  className?: string;
  fallback: ReactNode;
  size?: "card" | "header";
  src: string | null;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden border-4 border-white bg-white shadow-md",
        sizeClassNames[size],
        className,
      )}
    >
      {src ? (
        <SignedImage
          alt={alt}
          className="object-cover object-center"
          fallback={fallback}
          loading="eager"
          src={src}
          wrapperClassName="size-full"
        />
      ) : (
        fallback
      )}
      {children}
    </div>
  );
}
