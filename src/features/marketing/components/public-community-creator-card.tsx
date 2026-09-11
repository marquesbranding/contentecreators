import { ShieldCheck } from "lucide-react";

import { SignedImage } from "@/shared/components/signed-image";
import { SocialPlatformIcon } from "@/shared/components/social-platform-icon";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardHeader } from "@/shared/components/ui/card";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";
import { cn } from "@/shared/lib/cn";
import {
  initialsFromName,
  nameSizeClass,
} from "@/shared/lib/names/display-name";

import type { PublicShowcaseCreatorDto } from "../types/public-landing-showcase.types";
import { ShowcaseLocation } from "./showcase-location";

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function formatEngagement(value: number) {
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

/**
 * The public mirror of `CatalogCreatorCard`. It shares the primitives and the
 * geometry, but not the component: the public DTO has no handle, no WhatsApp
 * counter and no detail route, so one card serving both would be mostly
 * optional props.
 */
export function PublicCommunityCreatorCard({
  creator,
}: {
  creator: PublicShowcaseCreatorDto;
}) {
  const visibleNiches = creator.niches.slice(0, 2);
  const hiddenNicheCount = creator.niches.length - visibleNiches.length;

  return (
    <Card
      className="ring-foreground/10 h-full gap-0 overflow-hidden rounded-2xl bg-[#f7f6f2] py-0 whitespace-normal text-black shadow-sm"
      role="article"
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="from-brand-blue/30 via-brand-pink/15 to-brand-lime/25 relative z-0 h-20 bg-gradient-to-br sm:h-24"
        />
        <ShieldCheck
          aria-label="Perfil aprovado"
          className="text-brand-blue absolute top-3 right-3 z-10 size-6"
        />
        <div className="absolute -bottom-7 left-4 z-10 size-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
          {creator.avatar ? (
            // The signed URL is minted server-side with a short life and
            // intentionally bypasses the Next image optimizer's host allowlist.
            <SignedImage
              alt={`Foto de perfil de ${creator.displayName}`}
              className="size-full object-cover"
              height={creator.avatar.height}
              src={creator.avatar.url}
              width={creator.avatar.width}
            />
          ) : (
            <div
              aria-hidden="true"
              className="bg-brand-night flex size-full items-center justify-center text-lg font-extrabold text-white"
            >
              {initialsFromName(creator.displayName)}
            </div>
          )}
        </div>
      </div>

      <CardHeader className="flex-1 gap-2.5 px-4 pt-9 pb-4">
        <h3
          className={cn(
            "truncate font-extrabold tracking-[-0.01em]",
            nameSizeClass(creator.displayName),
          )}
        >
          {creator.displayName}
        </h3>
        <ShowcaseLocation city={creator.city} state={creator.state} />
        {creator.metric ? (
          <p className="flex items-center gap-1.5 text-xs">
            <SocialPlatformIcon
              className="size-3.5 shrink-0"
              platform={creator.metric.platform}
            />
            {creator.metric.followerCount ? (
              <span className="font-semibold">
                {formatCompactNumber(creator.metric.followerCount)} seguidores
              </span>
            ) : null}
          </p>
        ) : null}
        {creator.metric?.engagementRate ? (
          <p className="text-xs text-black/60">
            <span className="font-semibold text-black">
              {formatEngagement(creator.metric.engagementRate)}
            </span>{" "}
            engajamento
          </p>
        ) : null}
        {creator.bioExcerpt ? (
          <p className="line-clamp-2 text-xs leading-5 [overflow-wrap:anywhere] text-black/60">
            {creator.bioExcerpt}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="bg-brand-night border-transparent text-[11px] text-white">
            {accountTypeLabels[creator.creatorType]}
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
    </Card>
  );
}
