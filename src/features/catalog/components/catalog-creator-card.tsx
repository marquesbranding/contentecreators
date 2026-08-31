import { ImageOff, MapPin, SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";

import { SignedImage } from "@/shared/components/signed-image";
import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";
import { SocialPlatformIcon } from "@/shared/components/social-platform-icon";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";

import type {
  CatalogCreatorType,
  CatalogNicheDto,
  CatalogSocialPlatform,
  CreatorCatalogCardDto,
} from "../types/creator-catalog.types";

export interface CatalogCreatorMediaViewModel {
  alt: string;
  src: string;
}

export type CatalogSelfReportedMetricKind =
  | "followers"
  | "interactions"
  | "views";

export interface CatalogSelfReportedMetricViewModel {
  /** Discriminates the metric so the card can pick which ones to show. */
  kind: CatalogSelfReportedMetricKind;
  label: string;
  value: string;
}

export interface CatalogPrimarySocialViewModel {
  followerLabel: string | null;
  handle: string | null;
  platform: CatalogSocialPlatform;
}

export interface CatalogCreatorCardViewModel extends Omit<
  CreatorCatalogCardDto,
  "creatorType" | "metrics"
> {
  cover?: CatalogCreatorMediaViewModel | null;
  creatorType: CatalogCreatorType;
  detailHref: string;
  media?: CatalogCreatorMediaViewModel | null;
  metrics?: CatalogSelfReportedMetricViewModel[];
  niches: CatalogNicheDto[];
  primarySocial?: CatalogPrimarySocialViewModel | null;
  socialPlatforms: CatalogSocialPlatform[];
}

function creatorTypeLabel(creatorType: CatalogCreatorType) {
  return creatorType === "UGC" ? "Criador UGC" : "Influenciador";
}

function CreatorCover({ creator }: { creator: CatalogCreatorCardViewModel }) {
  if (!creator.cover) {
    return (
      <div
        aria-hidden="true"
        className="from-brand-blue/30 via-brand-pink/15 to-brand-lime/25 relative z-0 h-20 bg-gradient-to-br sm:h-24"
      />
    );
  }

  return (
    // Signed catalog media is already authorized and intentionally bypasses
    // Next Image host allowlists; the server view model owns URL expiry.
    <SignedImage
      alt=""
      className="object-cover"
      src={creator.cover.src}
      wrapperClassName="z-0 h-20 w-full sm:h-24"
    />
  );
}

function CreatorAvatar({ creator }: { creator: CatalogCreatorCardViewModel }) {
  return (
    <div className="absolute -bottom-7 left-4 z-10 size-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
      {creator.media ? (
        <SignedImage
          alt={creator.media.alt}
          className="size-full object-cover"
          src={creator.media.src}
        />
      ) : (
        <div
          aria-label={`${creator.displayName} está sem foto de perfil`}
          className="bg-muted text-muted-foreground flex size-full items-center justify-center"
          role="img"
        >
          <ImageOff aria-hidden="true" className="size-6" />
        </div>
      )}
    </div>
  );
}

function CreatorLocation({
  city,
  state,
}: Pick<CatalogCreatorCardViewModel, "city" | "state">) {
  const location = [city, state].filter(Boolean).join(", ");

  if (!location) {
    return null;
  }

  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
      {location}
    </p>
  );
}

function CreatorPrimarySocial({
  primarySocial,
}: {
  primarySocial: CatalogCreatorCardViewModel["primarySocial"];
}) {
  if (!primarySocial) {
    return null;
  }

  return (
    <p className="flex items-center gap-1.5 text-xs">
      <SocialPlatformIcon
        className="size-3.5 shrink-0"
        platform={primarySocial.platform}
      />
      {primarySocial.handle ? (
        <span className="font-semibold">{primarySocial.handle}</span>
      ) : null}
      {primarySocial.followerLabel ? (
        <span className="text-muted-foreground">
          {primarySocial.handle ? "· " : ""}
          {primarySocial.followerLabel}
        </span>
      ) : null}
    </p>
  );
}

/**
 * Views and interactions only — the follower count already reads on the
 * primary-social line, so repeating it here would show the same number twice.
 */
function CreatorSelfReportedMetrics({
  metrics,
}: {
  metrics: CatalogCreatorCardViewModel["metrics"];
}) {
  const secondaryMetrics =
    metrics?.filter((metric) => metric.kind !== "followers") ?? [];

  if (secondaryMetrics.length === 0) {
    return null;
  }

  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {secondaryMetrics.map((metric) => (
        <li key={metric.kind}>
          <span className="text-foreground font-semibold">{metric.value}</span>{" "}
          {metric.label}
        </li>
      ))}
    </ul>
  );
}

export function CatalogCreatorCard({
  creator,
}: {
  creator: CatalogCreatorCardViewModel;
}) {
  const visibleNiches = creator.niches.slice(0, 2);
  const hiddenNicheCount = creator.niches.length - visibleNiches.length;

  return (
    <Card
      className="hover:border-brand-blue/30 h-full gap-0 overflow-hidden rounded-2xl border-border py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      role="article"
    >
      <div className="relative">
        <CreatorCover creator={creator} />
        <CreatorAvatar creator={creator} />
      </div>

      <CardHeader className="gap-2.5 px-4 pt-9 pb-3">
        <CardTitle>
          <h3 className="truncate text-base font-extrabold tracking-[-0.01em]">
            {creator.displayName}
          </h3>
        </CardTitle>
        <CreatorLocation city={creator.city} state={creator.state} />
        <CreatorPrimarySocial primarySocial={creator.primarySocial} />
        <CreatorSelfReportedMetrics metrics={creator.metrics} />
        {creator.bioExcerpt ? (
          <p className="text-muted-foreground line-clamp-2 text-xs leading-5">
            {creator.bioExcerpt}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="bg-brand-night border-transparent text-[11px] text-white">
            {creatorTypeLabel(creator.creatorType)}
          </Badge>
          {visibleNiches.map((niche) => (
            <Badge className="text-[11px]" key={niche.slug} variant="secondary">
              {niche.name}
            </Badge>
          ))}
          {hiddenNicheCount > 0 ? (
            <Badge className="text-[11px]" variant="secondary">
              +{hiddenNicheCount}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardFooter className="border-t-0 bg-card px-4 pt-0 pb-4">
        <Link
          aria-label={`Ver perfil de ${creator.displayName}`}
          className={cn(
            buttonVariants({
              className: "bg-brand-night hover:bg-brand-night/90 h-9 w-full text-sm text-white",
              size: "sm",
            }),
          )}
          href={creator.detailHref}
        >
          Conhecer creator
          <SquareArrowOutUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
