import { MapPin, UsersRound } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";

import {
  CreatorDetailLink,
  type SponsorshipFeaturedCreatorViewModel,
} from "./sponsorship-featured-creator";
import {
  isSponsorshipCreativeVisible,
  SponsorshipLabels,
  SponsorshipMedia,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";

export interface SponsorshipFeaturedCreatorItem {
  creative: SponsorshipCreativeViewModel;
  creator: SponsorshipFeaturedCreatorViewModel;
}

export function isFeaturedCreatorItemVisible({
  creative,
  creator,
}: SponsorshipFeaturedCreatorItem) {
  return (
    creator.eligible &&
    isSponsorshipCreativeVisible({ ...creative, participantDerived: true })
  );
}

/** Compact variant of `SponsorshipFeaturedCreator`, sized to sit in a row. */
export function SponsorshipFeaturedCreatorCard({
  creative,
  creator,
}: SponsorshipFeaturedCreatorItem) {
  if (!isFeaturedCreatorItemVisible({ creative, creator })) {
    return null;
  }

  return (
    <article
      aria-label={`Creator em destaque: ${creator.displayName}`}
      className="h-full min-w-0"
      data-slot="sponsorship-featured-creator-card"
    >
      <Card className="border-brand-blue/20 h-full justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SponsorshipLabels
              {...creative}
              previewMode={creative.previewMode}
            />
            <Badge>Creator em destaque</Badge>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {creator.media ? (
              <SponsorshipMedia
                className="size-16 shrink-0 overflow-hidden rounded-xl"
                media={creator.media}
              />
            ) : (
              <div
                aria-hidden="true"
                className="bg-brand-blue-soft text-brand-blue flex size-16 shrink-0 items-center justify-center rounded-xl"
              >
                <UsersRound className="size-6" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="truncate text-lg font-bold tracking-[-0.02em]">
                {creator.displayName}
              </h3>
              {creator.location ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{creator.location}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <CreatorDetailLink creator={creator} />
        </div>
      </Card>
    </article>
  );
}
