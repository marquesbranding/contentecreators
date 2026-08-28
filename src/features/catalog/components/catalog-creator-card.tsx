import {
  BarChart3,
  ImageOff,
  MapPin,
  ShieldCheck,
  SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";
import { SocialPlatformIcon } from "@/shared/components/social-platform-icon";
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
  TELEGRAM: "Telegram",
  THREADS: "Threads",
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
        className="from-brand-blue/35 to-brand-night text-brand-blue flex aspect-[16/9] items-center justify-center border-b border-white/10 bg-gradient-to-br"
        role="img"
      >
        <span className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
          <ImageOff aria-hidden="true" className="size-8" />
        </span>
      </div>
    );
  }

  return (
    // Signed catalog media is already authorized and intentionally bypasses
    // Next Image host allowlists; the server view model owns URL expiry.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={creator.media.alt}
      className="aspect-[16/9] w-full object-cover"
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
    <p className="flex items-center gap-1.5 text-sm text-white/55">
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
      className="bg-brand-night-surface h-full gap-0 overflow-hidden rounded-2xl border-white/10 py-0 text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/20"
      role="article"
    >
      <CreatorMedia creator={creator} />

      <CardHeader className="gap-3 px-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="bg-brand-blue/30 border-transparent text-white"
            variant="ghost"
          >
            {creatorTypeLabel(creator.creatorType)}
          </Badge>
          {creator.socialPlatforms.map((platform) => (
            <Badge
              className="gap-1.5 border-white/15 bg-white/5 text-white/70"
              key={platform}
              variant="outline"
            >
              <SocialPlatformIcon className="size-3.5" platform={platform} />
              {socialPlatformLabels[platform]}
            </Badge>
          ))}
        </div>
        <div className="space-y-1.5">
          <CardTitle>
            <h3 className="text-xl font-bold tracking-[-0.02em]">
              {creator.displayName}
            </h3>
          </CardTitle>
          <CreatorLocation city={creator.city} state={creator.state} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 px-5 py-4">
        {creator.bioExcerpt ? (
          <p className="line-clamp-3 leading-6 text-white/60">
            {creator.bioExcerpt}
          </p>
        ) : null}

        {creator.niches.length > 0 ? (
          <ul aria-label="Nichos" className="flex flex-wrap gap-2">
            {creator.niches.map((niche) => (
              <li key={niche.slug}>
                <Badge
                  className="bg-white/10 text-white/70"
                  variant="secondary"
                >
                  {niche.name}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {metrics.length > 0 ? (
          <div className="mt-auto rounded-xl border border-white/10 bg-black/10 p-3">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-white/50">
              <BarChart3 aria-hidden="true" className="size-4" />
              Informado pelo criador
            </p>
            <dl className="grid grid-cols-2 gap-3">
              {metrics.map((metric) => (
                <div
                  className="min-w-0"
                  key={`${metric.label}-${metric.value}`}
                >
                  <dd className="text-lg font-bold text-white">
                    {metric.value}
                  </dd>
                  <dt className="mt-0.5 truncate text-xs text-white/60">
                    {metric.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="border-t border-white/10 bg-transparent px-5 py-4">
        <Link
          aria-label={`Ver perfil de ${creator.displayName}`}
          className={buttonVariants({
            className: "w-full",
            size: "lg",
          })}
          href={creator.detailHref}
        >
          <ShieldCheck aria-hidden="true" />
          Conhecer creator
          <SquareArrowOutUpRight aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
