import "server-only";

import { and, asc, eq, gt, isNull, or, sql, type SQL } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import {
  accounts,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  niches,
  socialProfiles,
} from "@/db/schema";

import type {
  CatalogNicheDto,
  CatalogCardMetricDto,
  CatalogSocialPlatform,
  CatalogViewer,
  CreatorCatalogPageDto,
  CreatorCatalogQuery,
} from "../../types/creator-catalog.types";
import { encodeCreatorCatalogCursor } from "./creator-catalog-cursor";

const BIO_EXCERPT_LENGTH = 180;

function catalogPredicates(
  filters: CreatorCatalogQuery,
  viewer: CatalogViewer,
) {
  const predicates: SQL[] = [
    eq(accounts.role, "INFLUENCER"),
    eq(accounts.status, "APPROVED"),
    isNull(accounts.archivedAt),
    isNull(creatorProfiles.archivedAt),
  ];

  if (viewer.role === "INFLUENCER") {
    predicates.push(sql`${creatorProfiles.accountId} <> ${viewer.accountId}`);
  }

  if (filters.search) {
    const normalizedSearch = sql`public.normalize_search_text(${filters.search})`;
    predicates.push(sql`
      ${creatorProfiles.searchDocument} like '%' || ${normalizedSearch} || '%'
      and (
        public.normalize_search_text(${creatorProfiles.displayName}) like '%' || ${normalizedSearch} || '%'
        or public.normalize_search_text(${creatorProfiles.legalName}) like '%' || ${normalizedSearch} || '%'
      )
    `);
  }

  if (filters.niche) {
    predicates.push(sql`
      exists (
        select 1
        from ${creatorNiches}
        inner join ${niches} on ${niches.id} = ${creatorNiches.nicheId}
        where ${creatorNiches.creatorProfileId} = ${creatorProfiles.id}
          and ${niches.slug} = ${filters.niche}
          and ${niches.isActive}
      )
    `);
  }

  if (filters.platform) {
    predicates.push(sql`
      exists (
        select 1
        from ${socialProfiles}
        where ${socialProfiles.ownerAccountId} = ${creatorProfiles.accountId}
          and ${socialProfiles.platform} = ${filters.platform}
          and ${socialProfiles.isVisibleInCatalog}
          and ${socialProfiles.archivedAt} is null
      )
    `);
  }

  if (filters.city) {
    predicates.push(
      sql`public.normalize_search_text(${creatorProfiles.city}) = public.normalize_search_text(${filters.city})`,
    );
  }

  if (filters.state) {
    predicates.push(eq(creatorProfiles.state, filters.state));
  }

  if (filters.creatorType) {
    predicates.push(eq(creatorProfiles.creatorType, filters.creatorType));
  }

  if (filters.cursor) {
    predicates.push(
      or(
        gt(creatorProfiles.displayName, filters.cursor.displayName),
        and(
          eq(creatorProfiles.displayName, filters.cursor.displayName),
          gt(creatorProfiles.id, filters.cursor.creatorProfileId),
        ),
      ) as SQL,
    );
  }

  return and(...predicates);
}

export async function listCreatorCatalog(
  transaction: ApplicationTransaction,
  filters: CreatorCatalogQuery,
  viewer: CatalogViewer,
): Promise<CreatorCatalogPageDto> {
  const rows = await transaction
    .select({
      avatarAssetId: creatorProfiles.avatarAssetId,
      bioExcerpt: sql<string | null>`
        case
          when ${creatorProfiles.bio} is null then null
          else left(${creatorProfiles.bio}, ${BIO_EXCERPT_LENGTH})
        end
      `,
      city: creatorProfiles.city,
      creatorId: creatorProfiles.id,
      creatorType: creatorProfiles.creatorType,
      displayName: creatorProfiles.displayName,
      metrics: sql<CatalogCardMetricDto[]>`
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'engagementRate', catalog_metric.engagement_rate,
                'followerCount', catalog_metric.follower_count,
                'observedOn', catalog_metric.observed_on,
                'platform', catalog_metric.platform,
                'source', 'SELF_REPORTED'
              )
              order by catalog_metric.platform
            )
            from (
              select distinct on (catalog_metric_snapshot.platform)
                catalog_metric_snapshot.engagement_rate::double precision as engagement_rate,
                catalog_metric_snapshot.follower_count,
                catalog_metric_snapshot.observed_on,
                catalog_metric_snapshot.platform
              from ${creatorMetricSnapshots} catalog_metric_snapshot
              where catalog_metric_snapshot.creator_profile_id = ${creatorProfiles.id}
              order by
                catalog_metric_snapshot.platform,
                catalog_metric_snapshot.observed_on desc,
                catalog_metric_snapshot.created_at desc
            ) catalog_metric
          ),
          '[]'::jsonb
        )
      `,
      niches: sql<CatalogNicheDto[]>`
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object('name', catalog_niche.name, 'slug', catalog_niche.slug)
              order by catalog_niche.sort_order, catalog_niche.name, catalog_niche.id
            )
            from ${creatorNiches} catalog_creator_niche
            inner join ${niches} catalog_niche
              on catalog_niche.id = catalog_creator_niche.niche_id
            where catalog_creator_niche.creator_profile_id = ${creatorProfiles.id}
              and catalog_niche.is_active
          ),
          '[]'::jsonb
        )
      `,
      socialPlatforms: sql<CatalogSocialPlatform[]>`
        coalesce(
          (
            select jsonb_agg(catalog_social.platform order by catalog_social.platform)
            from (
              select distinct catalog_social_profile.platform
              from ${socialProfiles} catalog_social_profile
              where catalog_social_profile.owner_account_id = ${creatorProfiles.accountId}
                and catalog_social_profile.is_visible_in_catalog
                and catalog_social_profile.archived_at is null
            ) catalog_social
          ),
          '[]'::jsonb
        )
      `,
      state: creatorProfiles.state,
    })
    .from(creatorProfiles)
    .innerJoin(accounts, eq(accounts.id, creatorProfiles.accountId))
    .where(catalogPredicates(filters, viewer))
    .orderBy(asc(creatorProfiles.displayName), asc(creatorProfiles.id))
    .limit(filters.pageSize + 1);

  const hasNextPage = rows.length > filters.pageSize;
  const pageRows = hasNextPage ? rows.slice(0, filters.pageSize) : rows;
  const lastItem = pageRows.at(-1);

  return {
    items: pageRows,
    nextCursor:
      hasNextPage && lastItem
        ? encodeCreatorCatalogCursor({
            creatorProfileId: lastItem.creatorId,
            displayName: lastItem.displayName,
          })
        : null,
    pageSize: filters.pageSize,
  };
}
