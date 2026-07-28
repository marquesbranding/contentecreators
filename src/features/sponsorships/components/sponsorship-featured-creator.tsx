import {
  ExternalLink,
  MapPin,
  SquareArrowOutUpRight,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

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
      <a
        aria-label={`Ver perfil de ${creator.displayName}`}
        className={buttonVariants({
          className: "min-h-12 w-full sm:w-fit",
          size: "lg",
        })}
        href={creator.detailHref}
      >
        Ver perfil
        <SquareArrowOutUpRight aria-hidden="true" />
      </a>
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
        className: "min-h-12 w-full sm:w-fit",
        size: "lg",
      })}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      Ver perfil
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
      <Card className="border-brand-blue/20 grid gap-0 overflow-hidden rounded-2xl bg-white py-0 shadow-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
        {creator.media ? (
          <SponsorshipMedia
            className="aspect-[16/9] h-full max-h-64 border-b sm:aspect-auto sm:border-r sm:border-b-0"
            media={creator.media}
          />
        ) : (
          <div
            aria-label={`${creator.displayName} está sem foto de perfil`}
            className="bg-brand-blue-soft text-brand-blue flex aspect-[16/9] items-center justify-center border-b sm:aspect-auto sm:border-r sm:border-b-0"
            role="img"
          >
            <UsersRound aria-hidden="true" className="size-10" />
          </div>
        )}

        <div className="min-w-0 py-5">
          <CardHeader className="gap-3 px-5">
            <SponsorshipLabels
              advertiserLabel={creative.advertiserLabel}
              previewMode={creative.previewMode}
            />
            <div className="flex flex-wrap gap-2">
              <Badge>Creator em destaque</Badge>
              <Badge variant="outline">{creator.creatorTypeLabel}</Badge>
            </div>
            <CardTitle>
              <h2 className="text-2xl font-bold tracking-[-0.03em]">
                {creator.displayName}
              </h2>
            </CardTitle>
            {creator.location ? (
              <CardDescription className="flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="size-4" />
                {creator.location}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            {creator.bioExcerpt ? (
              <p className="text-muted-foreground line-clamp-3 leading-6">
                {creator.bioExcerpt}
              </p>
            ) : null}
            <CreatorDetailLink creator={creator} />
          </CardContent>
        </div>
      </Card>
    </article>
  );
}
