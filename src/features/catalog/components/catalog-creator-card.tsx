import {
  BarChart3,
  ImageOff,
  MapPin,
  SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

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

export interface CatalogSelfReportedMetricViewModel {
  label: string;
  value: string;
}

export interface CatalogCreatorCardViewModel extends Omit<
  CreatorCatalogCardDto,
  "creatorType" | "metrics"
> {
  creatorType: CatalogCreatorType;
  detailHref: string;
  media?: CatalogCreatorMediaViewModel | null;
  metrics?: CatalogSelfReportedMetricViewModel[];
  niches: CatalogNicheDto[];
  socialPlatforms: CatalogSocialPlatform[];
}

const socialPlatformLabels: Record<CatalogSocialPlatform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  OTHER: "Outra rede",
  TIKTOK: "TikTok",
  X: "X",
  YOUTUBE: "YouTube",
};

function creatorTypeLabel(creatorType: CatalogCreatorType) {
  return creatorType === "UGC" ? "Criador UGC" : "Influenciador";
}

function CreatorMedia({ creator }: { creator: CatalogCreatorCardViewModel }) {
  if (!creator.media) {
    return (
      <div
        aria-label={`${creator.displayName} está sem foto de perfil`}
        className="bg-brand-blue-soft text-brand-blue flex aspect-[4/3] items-center justify-center border-b"
        role="img"
      >
        <ImageOff aria-hidden="true" className="size-10" />
      </div>
    );
  }

  return (
    // Signed catalog media is already authorized and intentionally bypasses
    // Next Image host allowlists; the server view model owns URL expiry.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={creator.media.alt}
      className="aspect-[4/3] w-full object-cover"
      decoding="async"
      height="480"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={creator.media.src}
      width="640"
    />
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
    <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
      <MapPin aria-hidden="true" className="size-4 shrink-0" />
      {location}
    </p>
  );
}

export function CatalogCreatorCard({
  creator,
}: {
  creator: CatalogCreatorCardViewModel;
}) {
  const metrics = creator.metrics ?? [];

  return (
    <Card
      className="h-full gap-0 overflow-hidden rounded-2xl border bg-white py-0 shadow-sm transition-shadow hover:shadow-md"
      role="article"
    >
      <CreatorMedia creator={creator} />

      <CardHeader className="gap-3 px-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="bg-brand-blue-soft text-[var(--brand-blue-hover)]"
            variant="ghost"
          >
            {creatorTypeLabel(creator.creatorType)}
          </Badge>
          {creator.socialPlatforms.map((platform) => (
            <Badge key={platform} variant="outline">
              {socialPlatformLabels[platform]}
            </Badge>
          ))}
        </div>
        <div className="space-y-1.5">
          <CardTitle>
            <h2 className="text-xl font-bold tracking-[-0.02em]">
              {creator.displayName}
            </h2>
          </CardTitle>
          <CreatorLocation city={creator.city} state={creator.state} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 px-5 py-4">
        {creator.bioExcerpt ? (
          <p className="text-muted-foreground line-clamp-3 leading-6">
            {creator.bioExcerpt}
          </p>
        ) : null}

        {creator.niches.length > 0 ? (
          <ul aria-label="Nichos" className="flex flex-wrap gap-2">
            {creator.niches.map((niche) => (
              <li key={niche.slug}>
                <Badge variant="secondary">{niche.name}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {metrics.length > 0 ? (
          <div className="mt-auto rounded-xl border bg-[var(--brand-canvas)] p-3">
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <BarChart3 aria-hidden="true" className="size-4" />
              Informado pelo criador
            </p>
            <dl className="grid gap-2">
              {metrics.map((metric) => (
                <div
                  className="flex items-baseline justify-between gap-3"
                  key={`${metric.label}-${metric.value}`}
                >
                  <dt className="text-muted-foreground text-xs">
                    {metric.label}
                  </dt>
                  <dd className="text-sm font-bold">{metric.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="border-t bg-white px-5 py-4">
        <Link
          aria-label={`Ver perfil de ${creator.displayName}`}
          className={buttonVariants({ className: "w-full", size: "lg" })}
          href={creator.detailHref}
        >
          Ver perfil
          <SquareArrowOutUpRight aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
