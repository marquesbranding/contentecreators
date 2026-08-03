import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { getDatabaseClient, type ApplicationDatabase } from "@/db/client";
import {
  accounts,
  companyLocations,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  niches,
} from "@/db/schema";

import type {
  PublicCommunityCreatorMetricDto,
  PublicCommunityNicheDto,
  PublicCommunityProofDto,
} from "../../types/public-community-proof.types";

const PUBLIC_PROOF_COMPANY_LIMIT = 10;
const PUBLIC_PROOF_CREATOR_LIMIT = 3;
const PUBLIC_PROOF_CREATOR_NICHE_LIMIT = 4;
const PUBLIC_PROOF_BIO_EXCERPT_LENGTH = 130;

export async function loadPublicCommunityProof(
  database: ApplicationDatabase,
): Promise<PublicCommunityProofDto> {
  const [creators, companies] = await Promise.all([
    database
      .select({
        bioExcerpt: sql<string | null>`
          case
            when ${creatorProfiles.bio} is null then null
            else left(${creatorProfiles.bio}, ${PUBLIC_PROOF_BIO_EXCERPT_LENGTH})
          end
        `,
        city: creatorProfiles.city,
        creatorId: creatorProfiles.id,
        creatorType: creatorProfiles.creatorType,
        displayName: creatorProfiles.displayName,
        metric: sql<PublicCommunityCreatorMetricDto | null>`
          (
            select jsonb_build_object(
              'engagementRate', public_creator_metric.engagement_rate,
              'followerCount', public_creator_metric.follower_count,
              'platform', public_creator_metric.platform
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
            ) public_creator_metric
          )
        `,
        niches: sql<PublicCommunityNicheDto[]>`
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object('name', public_creator_niche.name, 'slug', public_creator_niche.slug)
                order by public_creator_niche.sort_order, public_creator_niche.name, public_creator_niche.id
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
                limit ${PUBLIC_PROOF_CREATOR_NICHE_LIMIT}
              ) public_creator_niche
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
          eq(accounts.role, "INFLUENCER"),
          eq(accounts.status, "APPROVED"),
          isNull(accounts.archivedAt),
          isNull(creatorProfiles.archivedAt),
        ),
      )
      .orderBy(
        desc(creatorProfiles.isFeatured),
        asc(creatorProfiles.featureOrder),
        desc(accounts.approvedAt),
        asc(creatorProfiles.displayName),
        asc(creatorProfiles.id),
      )
      .limit(PUBLIC_PROOF_CREATOR_LIMIT),
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
        companyId: companyProfiles.id,
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
          eq(accounts.role, "COMPANY"),
          eq(accounts.status, "APPROVED"),
          isNull(accounts.archivedAt),
          isNull(companyProfiles.archivedAt),
        ),
      )
      .orderBy(
        desc(companyProfiles.isFeatured),
        asc(companyProfiles.featureOrder),
        desc(accounts.approvedAt),
        asc(companyProfiles.tradeName),
        asc(companyProfiles.id),
      )
      .limit(PUBLIC_PROOF_COMPANY_LIMIT),
  ]);

  return { companies, creators };
}

export function loadServerPublicCommunityProof() {
  return loadPublicCommunityProof(getDatabaseClient().database);
}
