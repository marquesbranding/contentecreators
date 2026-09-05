import type { DirectoryBrowserEntryDto } from "../api/catalog-directory.contract";
import { CatalogCompanyCard } from "./catalog-company-card";
import {
  CatalogCreatorCard,
  type CatalogCreatorCardViewModel,
  type CatalogSelfReportedMetricViewModel,
} from "./catalog-creator-card";

function formatMetricValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    compactDisplay: "short",
    notation: "compact",
  }).format(value);
}

function toCreatorCardViewModel(
  creator: Extract<DirectoryBrowserEntryDto, { kind: "CREATOR" }>,
): CatalogCreatorCardViewModel {
  const metric =
    creator.metrics.find((candidate) => candidate.isPrimary) ??
    creator.metrics[0];
  const metrics: CatalogSelfReportedMetricViewModel[] = metric
    ? [
        ...(metric.followerCount === null
          ? []
          : [
              {
                kind: "followers" as const,
                label: "seguidores",
                value: formatMetricValue(metric.followerCount),
              },
            ]),
        ...(metric.viewCount === null
          ? []
          : [
              {
                kind: "views" as const,
                label: "visualizações",
                value: formatMetricValue(metric.viewCount),
              },
            ]),
        ...(metric.interactionCount === null
          ? []
          : [
              {
                kind: "interactions" as const,
                label: "interações",
                value: formatMetricValue(metric.interactionCount),
              },
            ]),
      ]
    : [];

  return {
    bioExcerpt: creator.bioExcerpt,
    city: creator.city,
    cover: creator.cover ? { alt: "", src: creator.cover.url } : null,
    creatorId: creator.creatorId,
    creatorType: creator.creatorType,
    detailHref: `/app/creators/${creator.creatorId}`,
    displayName: creator.displayName,
    media: creator.avatar
      ? {
          alt: `Foto de perfil de ${creator.displayName}`,
          src: creator.avatar.url,
        }
      : null,
    metrics,
    niches: creator.niches,
    primarySocial: metric
      ? {
          followerLabel:
            metric.followerCount === null
              ? null
              : `${formatMetricValue(metric.followerCount)} seguidores`,
          handle: metric.handle,
          platform: metric.platform,
        }
      : null,
    socialPlatforms: creator.socialPlatforms,
    state: creator.state,
    whatsappContactCount: creator.whatsappContactCount,
  };
}

export function DirectoryEntryCard({
  entry,
}: {
  entry: DirectoryBrowserEntryDto;
}) {
  if (entry.kind === "COMPANY") {
    return <CatalogCompanyCard company={entry} />;
  }

  return <CatalogCreatorCard creator={toCreatorCardViewModel(entry)} />;
}
