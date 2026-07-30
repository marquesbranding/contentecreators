import { cn } from "@/shared/lib/cn";

export const brandLogoVariants = {
  black: {
    offsetLeft: "-8.33%",
    offsetTop: "-110.39%",
    src: "/brand/official/contente-creators-black.png",
    width: "116.70%",
  },
  blue: {
    offsetLeft: "-7.42%",
    offsetTop: "-110.39%",
    src: "/brand/official/contente-creators-blue.png",
    width: "116.74%",
  },
  lime: {
    offsetLeft: "-9.80%",
    offsetTop: "-110.39%",
    src: "/brand/official/contente-creators-lime.png",
    width: "116.70%",
  },
  pink: {
    offsetLeft: "-9.80%",
    offsetTop: "-98.08%",
    src: "/brand/official/contente-creators-pink.png",
    width: "116.70%",
  },
  "royal-blue": {
    offsetLeft: "-5.95%",
    offsetTop: "-110.39%",
    src: "/brand/official/contente-creators-royal-blue.png",
    width: "116.70%",
  },
  white: {
    offsetLeft: "-7.42%",
    offsetTop: "-98.08%",
    src: "/brand/official/contente-creators-white.png",
    width: "116.74%",
  },
} as const;

export type BrandLogoVariant = keyof typeof brandLogoVariants;
export type BrandLogoBackground = "auto" | "dark" | "light" | "transparent";

interface BrandLogoProps {
  background?: BrandLogoBackground;
  className?: string;
  preload?: boolean;
  variant?: BrandLogoVariant;
}

const backgroundClasses = {
  dark: "bg-brand-night",
  light: "bg-white",
  transparent: "bg-transparent",
} as const;

export function BrandLogo({
  background = "auto",
  className,
  preload = false,
  variant = "blue",
}: BrandLogoProps) {
  const artwork = brandLogoVariants[variant];
  const resolvedBackground =
    background === "auto"
      ? variant === "white"
        ? "dark"
        : variant === "black"
          ? "light"
          : "transparent"
      : background;

  return (
    <span
      className={cn(
        "relative block aspect-[2857/1039] h-auto w-[9.35rem] shrink-0 overflow-hidden sm:w-[10.65rem]",
        backgroundClasses[resolvedBackground],
        className,
      )}
      data-brand-background={resolvedBackground}
      data-brand-variant={variant}
    >
      {/* The supplied artwork is already a compact production PNG. Serving it
          directly avoids making the shared brand mark depend on the runtime
          image optimizer across Auth, onboarding, product, and backoffice. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Contente Creators"
        className="absolute h-auto max-w-none select-none"
        data-brand-delivery="direct"
        decoding="async"
        fetchPriority={preload ? "high" : "auto"}
        height={3_334}
        loading={preload ? "eager" : "lazy"}
        src={artwork.src}
        style={{
          left: artwork.offsetLeft,
          top: artwork.offsetTop,
          width: artwork.width,
        }}
        width={3_334}
      />
    </span>
  );
}
