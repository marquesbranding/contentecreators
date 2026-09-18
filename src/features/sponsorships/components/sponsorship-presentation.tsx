import {
  toAppearanceStyle,
  sponsorshipAccessibleName,
  type SponsorshipAppearance,
} from "../domain/sponsorship-appearance";
import { ExternalLink, Eye, Megaphone } from "lucide-react";

import { SignedImage } from "@/shared/components/signed-image";
import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";

export interface SponsorshipMediaViewModel {
  alt: string;
  height?: number | null;
  url: string;
  width?: number | null;
}

export interface SponsorshipLinkViewModel {
  href: string;
  buttonLabel: string | null;
  onCreative: boolean;
}

export interface SponsorshipCreativeViewModel {
  advertiserLabel?: string | null;
  imageAlt?: string | null;
  appearance?: SponsorshipAppearance;
  showSponsoredBadge?: boolean;
  showAdvertiserLabel?: boolean;
  audienceMatches: boolean;
  body?: string | null;
  eligible: boolean;
  id: string;
  link?: SponsorshipLinkViewModel | null;
  /** The mandatory desktop (≥1024px viewport) variant. */
  media?: SponsorshipMediaViewModel | null;
  /** Optional narrower variant (<640px viewport); falls back to `media` when absent. */
  mediaMobile?: SponsorshipMediaViewModel | null;
  /** Optional mid-width variant (640–1023px viewport); falls back to `media` when absent. */
  mediaTablet?: SponsorshipMediaViewModel | null;
  participantDerived?: boolean;
  previewMode?: boolean;
  publicSocialProofEnabled?: boolean;
  routeMatches: boolean;
  title: string | null;
  viewerIsPublic?: boolean;
}

/** Below this, the mobile creative variant applies (when uploaded). */
export const SPONSORSHIP_TABLET_BREAKPOINT = "(min-width: 640px)";
/** At or above this, the desktop creative variant applies. */
export const SPONSORSHIP_DESKTOP_BREAKPOINT = "(min-width: 1024px)";

export function isSponsorshipCreativeVisible(
  creative: SponsorshipCreativeViewModel,
) {
  if (
    !creative.eligible ||
    !creative.audienceMatches ||
    !creative.routeMatches
  ) {
    return false;
  }

  return !(
    creative.viewerIsPublic &&
    creative.participantDerived &&
    creative.publicSocialProofEnabled !== true
  );
}

export function getSafeSponsorshipExternalHref(href: string) {
  try {
    const url = new URL(href);

    return (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function SponsorshipLabels({
  advertiserLabel,
  previewMode = false,
  showSponsoredBadge = true,
  showAdvertiserLabel = false,
}: Pick<
  SponsorshipCreativeViewModel,
  | "advertiserLabel"
  | "previewMode"
  | "showSponsoredBadge"
  | "showAdvertiserLabel"
>) {
  if (
    !showSponsoredBadge &&
    !(showAdvertiserLabel && advertiserLabel) &&
    !previewMode
  )
    return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showSponsoredBadge ? (
        <Badge className="gap-1.5" variant="secondary">
          <Megaphone aria-hidden="true" />
          Conteúdo patrocinado
        </Badge>
      ) : null}
      {showAdvertiserLabel && advertiserLabel ? (
        <Badge
          className="bg-background/95 h-auto max-w-full break-words whitespace-normal"
          variant="outline"
        >
          Patrocinado por {advertiserLabel}
        </Badge>
      ) : null}
      {previewMode ? (
        <Badge
          aria-label="Pré-visualização não publicada"
          className="bg-background/95 gap-1.5"
          role="status"
          variant="outline"
        >
          <Eye aria-hidden="true" />
          Pré-visualização
        </Badge>
      ) : null}
    </div>
  );
}

export function SponsorshipMedia({
  className,
  media,
  mediaMobile,
  mediaTablet,
}: {
  className?: string;
  media: SponsorshipMediaViewModel;
  mediaMobile?: SponsorshipMediaViewModel | null;
  mediaTablet?: SponsorshipMediaViewModel | null;
}) {
  const sources = [
    mediaMobile && { media: "(max-width: 639px)", src: mediaMobile.url },
    mediaTablet && {
      media: `${SPONSORSHIP_TABLET_BREAKPOINT} and (max-width: 1023px)`,
      src: mediaTablet.url,
    },
  ].filter((source) => source !== null && source !== undefined);

  return (
    // The server supplies short-lived authorized media URLs.
    <SignedImage
      alt={media.alt}
      className="object-cover"
      height={media.height}
      sources={sources.length > 0 ? sources : undefined}
      src={media.url}
      width={media.width}
      wrapperClassName={cn("w-full", className)}
    />
  );
}

export function SponsorshipExternalLink({
  className,
  link,
  appearance,
}: {
  className?: string;
  link: SponsorshipLinkViewModel;
  appearance?: SponsorshipAppearance;
}) {
  const href = getSafeSponsorshipExternalHref(link.href);

  if (!href || !link.buttonLabel) {
    return null;
  }

  return (
    <a
      className={cn(
        buttonVariants({ size: "lg" }),
        // Match the creator/company card CTA by default; an advertiser's
        // own buttonBackgroundColor/buttonTextColor overrides this via the
        // inline style below, which always wins over these classes.
        "bg-brand-night hover:bg-brand-night/90 relative z-20 h-auto min-h-12 py-3 text-white",
        className,
      )}
      style={toAppearanceStyle(appearance, true)}
      href={href}
      rel="sponsored noopener noreferrer"
      target="_blank"
    >
      {link.buttonLabel}
      <ExternalLink aria-hidden="true" />
    </a>
  );
}

export function SponsorshipCreativeLink({
  creative,
}: {
  creative: SponsorshipCreativeViewModel;
}) {
  const href = creative.link?.onCreative
    ? getSafeSponsorshipExternalHref(creative.link.href)
    : null;
  if (!href) return null;
  return (
    <a
      aria-label={sponsorshipAccessibleName(creative)}
      className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:ring-3 focus-visible:ring-blue-400 focus-visible:outline-none focus-visible:ring-inset"
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
    />
  );
}
