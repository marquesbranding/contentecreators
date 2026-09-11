import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { getDatabaseClient, type ApplicationDatabase } from "@/db/client";
import {
  accounts,
  companyLocations,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  mediaAssets,
  niches,
} from "@/db/schema";

import type {
  PublicCommunityCreatorMetricDto,
  PublicCommunityNicheDto,
} from "../../types/public-community-proof.types";
import type {
  PublicLandingShowcaseSource,
  PublicShowcaseImageSource,
} from "../../types/public-landing-showcase.types";

export const PUBLIC_SHOWCASE_LIMIT_PER_KIND = 12;
const PUBLIC_SHOWCASE_NICHE_LIMIT = 4;
const PUBLIC_SHOWCASE_BIO_EXCERPT_LENGTH = 130;

/*
 * Only profiles an admin enabled in the backoffice's landing management
 * (`is_featured`), in the order set there (`feature_order`), and only while
 * they still meet the catalog's own eligibility bar.
 */
export async function loadPublicLandingShowcaseSource(
  database: ApplicationDatabase,
): Promise<PublicLandingShowcaseSource> {
  const [creators, companies] = await Promise.all([
    database
      .select({
        avatarSource: sql<PublicShowcaseImageSource | null>`
          (
            select jsonb_build_object(
              'bucketName', ${mediaAssets.bucketName},
              'height', ${mediaAssets.height},
              'objectPath', ${mediaAssets.objectPath},
              'width', ${mediaAssets.width}
            )
            from ${mediaAssets}
            where ${mediaAssets.id} = ${creatorProfiles.avatarAssetId}
              and ${mediaAssets.ownerAccountId} = ${creatorProfiles.accountId}
              and ${mediaAssets.kind} = 'AVATAR'
              and ${mediaAssets.status} = 'ACTIVE'
              and ${mediaAssets.archivedAt} is null
          )
        `,
        bioExcerpt: sql<string | null>`
          case
            when ${creatorProfiles.bio} is null then null
            else left(${creatorProfiles.bio}, ${PUBLIC_SHOWCASE_BIO_EXCERPT_LENGTH})
          end
        `,
        city: creatorProfiles.city,
        creatorType: creatorProfiles.creatorType,
        displayName: creatorProfiles.displayName,
        id: creatorProfiles.id,
        metric: sql<PublicCommunityCreatorMetricDto | null>`
          (
            select jsonb_build_object(
              'engagementRate', showcase_metric.engagement_rate,
              'followerCount', showcase_metric.follower_count,
              'platform', showcase_metric.platform
            )
            from (
              select
                ${creatorMetricSnapshots.engagementRate}::double precision as engagement_rate,
                ${creatorMetricSnapshots.followerCount} as follower_count,
                ${creatorMetricSnapshots.platform} as platform
              from ${creatorMetricSnapshots}
              where ${creatorMetricSnapshots.creatorProfileId} = ${creatorProfiles.id}
              order by
                ${creatorMetricSnapshots.followerCount} desc nulls last,
                ${creatorMetricSnapshots.observedOn} desc,
                ${creatorMetricSnapshots.createdAt} desc
              limit 1
            ) showcase_metric
          )
        `,
        niches: sql<PublicCommunityNicheDto[]>`
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object('name', showcase_niche.name, 'slug', showcase_niche.slug)
                order by showcase_niche.sort_order, showcase_niche.name, showcase_niche.id
              )
              from (
                select
                  ${niches.id} as id,
                  ${niches.name} as name,
                  ${niches.slug} as slug,
                  ${niches.sortOrder} as sort_order
                from ${creatorNiches}
                inner join ${niches}
                  on ${niches.id} = ${creatorNiches.nicheId}
                where ${creatorNiches.creatorProfileId} = ${creatorProfiles.id}
                  and ${niches.isActive}
                order by ${niches.sortOrder}, ${niches.name}, ${niches.id}
                limit ${PUBLIC_SHOWCASE_NICHE_LIMIT}
              ) showcase_niche
            ),
            '[]'::jsonb
          )
        `,
        state: creatorProfiles.state,
      })
      .from(creatorProfiles)
      .innerJoin(accounts, eq(accounts.id, creatorProfiles.accountId))
      .where(
        and(
          creatorProfiles.isFeatured,
          eq(accounts.role, "INFLUENCER"),
          eq(accounts.status, "APPROVED"),
          isNull(accounts.archivedAt),
          isNull(creatorProfiles.archivedAt),
        ),
      )
      .orderBy(asc(creatorProfiles.featureOrder), asc(creatorProfiles.id))
      .limit(PUBLIC_SHOWCASE_LIMIT_PER_KIND),
    database
      .select({
        city: sql<string | null>`
          (
            select ${companyLocations.city}
            from ${companyLocations}
            where ${companyLocations.companyProfileId} = ${companyProfiles.id}
              and ${companyLocations.archivedAt} is null
            order by ${companyLocations.isPrimary} desc, ${companyLocations.id}
            limit 1
          )
        `,
        id: companyProfiles.id,
        logoSource: sql<PublicShowcaseImageSource | null>`
          (
            select jsonb_build_object(
              'bucketName', ${mediaAssets.bucketName},
              'height', ${mediaAssets.height},
              'objectPath', ${mediaAssets.objectPath},
              'width', ${mediaAssets.width}
            )
            from ${mediaAssets}
            where ${mediaAssets.id} = ${companyProfiles.logoAssetId}
              and ${mediaAssets.ownerAccountId} = ${companyProfiles.accountId}
              and ${mediaAssets.kind} = 'LOGO'
              and ${mediaAssets.status} = 'ACTIVE'
              and ${mediaAssets.archivedAt} is null
              and ${mediaAssets.replacedByAssetId} is null
          )
        `,
        segment: companyProfiles.segment,
        state: sql<string | null>`
          (
            select ${companyLocations.state}
            from ${companyLocations}
            where ${companyLocations.companyProfileId} = ${companyProfiles.id}
              and ${companyLocations.archivedAt} is null
            order by ${companyLocations.isPrimary} desc, ${companyLocations.id}
            limit 1
          )
        `,
        tradeName: companyProfiles.tradeName,
      })
      .from(companyProfiles)
      .innerJoin(accounts, eq(accounts.id, companyProfiles.accountId))
      .where(
        and(
          companyProfiles.isFeatured,
          eq(accounts.role, "COMPANY"),
          eq(accounts.status, "APPROVED"),
          eq(accounts.completionPercentage, 100),
          isNull(accounts.archivedAt),
          isNull(companyProfiles.archivedAt),
        ),
      )
      .orderBy(asc(companyProfiles.featureOrder), asc(companyProfiles.id))
      .limit(PUBLIC_SHOWCASE_LIMIT_PER_KIND),
  ]);

  return { companies, creators };
}

export function loadServerPublicLandingShowcaseSource() {
  return loadPublicLandingShowcaseSource(getDatabaseClient().database);
}
