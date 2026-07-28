import { ExternalLink, Eye, Megaphone } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";

export interface SponsorshipMediaViewModel {
  alt: string;
  height?: number | null;
  url: string;
  width?: number | null;
}

export interface SponsorshipLinkViewModel {
  href: string;
  label: string;
}

export interface SponsorshipCreativeViewModel {
  advertiserLabel?: string | null;
  audienceMatches: boolean;
  body?: string | null;
  eligible: boolean;
  id: string;
  link?: SponsorshipLinkViewModel | null;
  media?: SponsorshipMediaViewModel | null;
  participantDerived?: boolean;
  previewMode?: boolean;
  publicSocialProofEnabled?: boolean;
  routeMatches: boolean;
  title: string;
  viewerIsPublic?: boolean;
}

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

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function SponsorshipLabels({
  advertiserLabel,
  previewMode = false,
}: Pick<SponsorshipCreativeViewModel, "advertiserLabel" | "previewMode">) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="gap-1.5" variant="secondary">
        <Megaphone aria-hidden="true" />
        Conteúdo patrocinado
      </Badge>
      {advertiserLabel ? (
        <Badge variant="outline">Por {advertiserLabel}</Badge>
      ) : null}
      {previewMode ? (
        <Badge
          aria-label="Pré-visualização não publicada"
          className="gap-1.5"
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
}: {
  className?: string;
  media: SponsorshipMediaViewModel;
}) {
  return (
    // The server supplies a short-lived authorized media URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={media.alt}
      className={cn("w-full object-cover", className)}
      decoding="async"
      height={media.height ?? 900}
      loading="lazy"
      referrerPolicy="no-referrer"
      src={media.url}
      width={media.width ?? 1_600}
    />
  );
}

export function SponsorshipExternalLink({
  className,
  link,
}: {
  className?: string;
  link: SponsorshipLinkViewModel;
}) {
  const href = getSafeSponsorshipExternalHref(link.href);

  if (!href) {
    return null;
  }

  return (
    <a
      className={buttonVariants({
        className: cn("min-h-12", className),
        size: "lg",
      })}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {link.label}
      <ExternalLink aria-hidden="true" />
    </a>
  );
}

export function SponsorshipTopBanner({
  creative,
}: {
  creative: SponsorshipCreativeViewModel;
}) {
  if (!isSponsorshipCreativeVisible(creative)) {
    return null;
  }

  return (
    <section
      aria-label={`Patrocínio: ${creative.title}`}
      data-slot="sponsorship-top-banner"
      role="region"
    >
      <Card className="border-brand-blue/20 grid gap-0 overflow-hidden rounded-2xl bg-white py-0 shadow-sm md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {creative.media ? (
          <SponsorshipMedia
            className="aspect-[16/8] h-full max-h-80 border-b md:order-2 md:border-b-0 md:border-l"
            media={creative.media}
          />
        ) : null}
        <div className="flex min-w-0 flex-col justify-center py-5 md:order-1 md:py-7">
          <CardHeader className="gap-3 px-5 md:px-7">
            <SponsorshipLabels
              advertiserLabel={creative.advertiserLabel}
              previewMode={creative.previewMode}
            />
            <CardTitle>
              <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
                {creative.title}
              </h2>
            </CardTitle>
            {creative.body ? (
              <CardDescription className="max-w-xl text-base leading-6">
                {creative.body}
              </CardDescription>
            ) : null}
          </CardHeader>
          {creative.link ? (
            <CardContent className="mt-1 px-5 md:px-7">
              <SponsorshipExternalLink
                className="w-full sm:w-fit"
                link={creative.link}
              />
            </CardContent>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
