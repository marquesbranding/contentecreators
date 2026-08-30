import {
  ExternalLink,
  MapPin,
  SquareArrowOutUpRight,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

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

import {
  getSafeSponsorshipExternalHref,
  isSponsorshipCreativeVisible,
  type SponsorshipCreativeViewModel,
  type SponsorshipMediaViewModel,
  SponsorshipLabels,
  SponsorshipMedia,
} from "./sponsorship-presentation";

export interface SponsorshipFeaturedCreatorViewModel {
  bioExcerpt?: string | null;
  creatorTypeLabel: string;
  detailHref: string;
  displayName: string;
  eligible: boolean;
  location?: string | null;
  media?: SponsorshipMediaViewModel | null;
}

function CreatorDetailLink({
  creator,
}: {
  creator: SponsorshipFeaturedCreatorViewModel;
}) {
  if (creator.detailHref.startsWith("/")) {
    return (
      <Link
        aria-label={`Ver perfil de ${creator.displayName}`}
        className={buttonVariants({
          className:
            "size-9 gap-0 rounded-full bg-white p-0 sm:w-fit sm:gap-1.5 sm:px-3",
          size: "sm",
          variant: "outline",
        })}
        href={creator.detailHref}
      >
        <span className="sr-only sm:not-sr-only">Ver perfil</span>
        <SquareArrowOutUpRight aria-hidden="true" />
      </Link>
    );
  }

  const href = getSafeSponsorshipExternalHref(creator.detailHref);

  if (!href) {
    return null;
  }

  return (
    <a
      aria-label={`Ver perfil de ${creator.displayName}`}
      className={buttonVariants({
        className:
          "size-9 gap-0 rounded-full bg-white p-0 sm:w-fit sm:gap-1.5 sm:px-3",
        size: "sm",
        variant: "outline",
      })}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="sr-only sm:not-sr-only">Ver perfil</span>
      <ExternalLink aria-hidden="true" />
    </a>
  );
}

export function SponsorshipFeaturedCreator({
  creative,
  creator,
}: {
  creative: SponsorshipCreativeViewModel;
  creator: SponsorshipFeaturedCreatorViewModel;
}) {
  const featuredCreative = { ...creative, participantDerived: true };

  if (!creator.eligible || !isSponsorshipCreativeVisible(featuredCreative)) {
    return null;
  }

  return (
    <article aria-label={`Creator em destaque: ${creator.displayName}`}>
      <Card
        className={cn(
          "border-brand-blue/20 grid gap-0 overflow-hidden rounded-2xl bg-white py-0 shadow-sm",
          creator.media ? "sm:grid-cols-[10rem_minmax(0,1fr)]" : "p-3.5 sm:p-5",
        )}
      >
        {creator.media ? (
          <SponsorshipMedia
            className="h-28 border-b sm:h-full sm:max-h-64 sm:min-h-full sm:border-r sm:border-b-0"
            media={creator.media}
          />
        ) : null}

        <div className={cn("min-w-0", creator.media ? "py-4 sm:py-5" : null)}>
          <CardHeader
            className={cn(
              "gap-2 sm:gap-3",
              creator.media ? "px-4 sm:px-5" : "px-0",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <SponsorshipLabels
                advertiserLabel={creative.advertiserLabel}
                previewMode={creative.previewMode}
              />
              <Badge>Creator em destaque</Badge>
              {creator.media ? (
                <Badge variant="outline">{creator.creatorTypeLabel}</Badge>
              ) : null}
            </div>
            <div className="flex min-w-0 items-center gap-3">
              {!creator.media ? (
                <div
                  aria-hidden="true"
                  className="bg-brand-blue-soft text-brand-blue flex size-11 shrink-0 items-center justify-center rounded-2xl"
                >
                  <UsersRound className="size-5" />
                </div>
              ) : null}
              <CardTitle className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold tracking-[-0.03em] sm:text-2xl">
                  {creator.displayName}
                </h2>
              </CardTitle>
              {!creator.media ? <CreatorDetailLink creator={creator} /> : null}
            </div>
            {creator.location ? (
              <CardDescription className="flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="size-4" />
                {creator.location}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent
            className={cn(
              "space-y-3 sm:space-y-4",
              creator.media ? "px-4 sm:px-5" : "px-0",
            )}
          >
            {creator.bioExcerpt ? (
              <p className="text-muted-foreground line-clamp-3 leading-6">
                {creator.bioExcerpt}
              </p>
            ) : null}
            {creator.media ? <CreatorDetailLink creator={creator} /> : null}
          </CardContent>
        </div>
      </Card>
    </article>
  );
}
