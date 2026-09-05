import "server-only";

import { asc, eq, sql, type SQL } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import {
  accounts,
  companyLocations,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  niches,
  socialProfiles,
} from "@/db/schema";

import type {
  DirectoryCursor,
  DirectoryEntryDto,
  DirectoryFacetsDto,
  DirectoryPageDto,
  DirectoryQuery,
} from "../../types/catalog-directory.types";
import type {
  CatalogCardMetricDto,
  CatalogNicheDto,
  CatalogSocialPlatform,
  CatalogViewer,
} from "../../types/creator-catalog.types";
import { encodeDirectoryCursor } from "./catalog-directory-cursor";
import { listCompanySegmentFacets } from "./company-carousel.repository";

const BIO_EXCERPT_LENGTH = 180;
const DESCRIPTION_EXCERPT_LENGTH = 220;

const metricRangeColumns = {
  followersMax: "follower_count",
  followersMin: "follower_count",
  interactionsMax: "interaction_count",
  interactionsMin: "interaction_count",
  newFollowersMax: "new_follower_count",
  newFollowersMin: "new_follower_count",
  viewsMax: "view_count",
  viewsMin: "view_count",
} as const;

function hasMetricRangeFilter(filters: DirectoryQuery) {
  return (
    filters.followersMin !== undefined ||
    filters.followersMax !== undefined ||
    filters.viewsMin !== undefined ||
    filters.viewsMax !== undefined ||
    filters.interactionsMin !== undefined ||
    filters.interactionsMax !== undefined ||
    filters.newFollowersMin !== undefined ||
    filters.newFollowersMax !== undefined
  );
}

function cursorPredicate(
  createdAtColumn: SQL,
  idColumn: SQL,
  cursor: DirectoryCursor,
) {
  return sql`(${createdAtColumn} > ${cursor.createdAt}::timestamptz
    or (${createdAtColumn} = ${cursor.createdAt}::timestamptz and ${idColumn} > ${cursor.id}))`;
}

function metricRangeExists(filters: DirectoryQuery) {
  if (!hasMetricRangeFilter(filters)) {
    return null;
  }

  const bounds: SQL[] = [];

  for (const [key, column] of Object.entries(metricRangeColumns) as [
    keyof typeof metricRangeColumns,
    string,
  ][]) {
    const value = filters[key];

    if (value === undefined) {
      continue;
    }

    const operator = key.endsWith("Min") ? sql`>=` : sql`<=`;
    bounds.push(sql`latest.${sql.raw(column)} ${operator} ${value}`);
  }

  return sql`
    exists (
      select 1
      from (
        select distinct on (platform)
          follower_count, view_count, interaction_count, new_follower_count
        from ${creatorMetricSnapshots}
        where creator_profile_id = ${creatorProfiles.id}
          ${filters.platform ? sql`and platform = ${filters.platform}` : sql``}
        order by platform, observed_on desc, created_at desc
      ) latest
      where ${sql.join(bounds, sql` and `)}
    )
  `;
}

function creatorTypeFilter(filters: DirectoryQuery) {
  if (!filters.type) {
    return null;
  }

  const wantsInfluencer = filters.type.includes("INFLUENCER");
  const wantsUgc = filters.type.includes("UGC");

  if (wantsInfluencer && wantsUgc) {
    return null;
  }

  if (wantsInfluencer) {
    return sql`${creatorProfiles.creatorType} = 'INFLUENCER'`;
  }

  return sql`${creatorProfiles.creatorType} = 'UGC'`;
}

function creatorMetricsProjection() {
  return sql<string>`
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'engagementRate', catalog_metric.engagement_rate,
            'followerCount', catalog_metric.follower_count,
            'handle', catalog_metric.handle,
            'interactionCount', catalog_metric.interaction_count,
            'isPrimary', coalesce(catalog_metric.is_primary, false),
            'observedOn', catalog_metric.observed_on,
            'platform', catalog_metric.platform,
            'source', 'SELF_REPORTED',
            'viewCount', catalog_metric.view_count
          )
          order by catalog_metric.platform
        )
        from (
          select distinct on (catalog_metric_snapshot.platform)
            catalog_metric_snapshot.engagement_rate::double precision as engagement_rate,
            catalog_metric_snapshot.follower_count,
            catalog_social_profile.handle,
            catalog_metric_snapshot.interaction_count,
            catalog_social_profile.is_primary,
            catalog_metric_snapshot.observed_on,
            catalog_metric_snapshot.platform,
            catalog_metric_snapshot.view_count
          from ${creatorMetricSnapshots} catalog_metric_snapshot
          left join ${socialProfiles} catalog_social_profile
            on catalog_social_profile.id = catalog_metric_snapshot.social_profile_id
          where catalog_metric_snapshot.creator_profile_id = ${creatorProfiles.id}
          order by
            catalog_metric_snapshot.platform,
            catalog_metric_snapshot.observed_on desc,
            catalog_metric_snapshot.created_at desc
        ) catalog_metric
      ),
      '[]'::jsonb
    )
  `;
}

function creatorNichesProjection() {
  return sql<string>`
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
  `;
}

function creatorSocialPlatformsProjection() {
  return sql<string>`
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
  `;
}

function buildCreatorBranch(filters: DirectoryQuery, viewer: CatalogViewer) {
  const predicates: SQL[] = [
    sql`${accounts.role} = 'INFLUENCER'`,
    sql`${accounts.status} = 'APPROVED'`,
    sql`${accounts.archivedAt} is null`,
    sql`${creatorProfiles.archivedAt} is null`,
    sql`${creatorProfiles.accountId} <> ${viewer.accountId}`,
  ];

  const typeFilter = creatorTypeFilter(filters);
  if (typeFilter) {
    predicates.push(typeFilter);
  }

  if (filters.search) {
    const normalizedSearch = sql`public.normalize_search_text(${filters.search})`;
    predicates.push(sql`
      ${creatorProfiles.searchDocument} like '%' || ${normalizedSearch} || '%'
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
    predicates.push(sql`${creatorProfiles.state} = ${filters.state}`);
  }

  const metricRange = metricRangeExists(filters);
  if (metricRange) {
    predicates.push(metricRange);
  }

  if (filters.cursor) {
    predicates.push(
      cursorPredicate(
        sql`${creatorProfiles.createdAt}`,
        sql`${creatorProfiles.id}`,
        filters.cursor,
      ),
    );
  }

  return sql`
    select
      'CREATOR'::text as kind,
      ${creatorProfiles.id} as id,
      to_jsonb(${creatorProfiles.createdAt}) #>> '{}' as "createdAt",
      ${creatorProfiles.displayName} as "displayName",
      ${creatorProfiles.city} as city,
      ${creatorProfiles.state} as state,
      case
        when ${creatorProfiles.bio} is null then null
        else left(${creatorProfiles.bio}, ${BIO_EXCERPT_LENGTH})
      end as description,
      ${creatorProfiles.avatarAssetId} as "primaryAssetId",
      ${creatorProfiles.coverAssetId} as "coverAssetId",
      ${creatorProfiles.creatorType}::text as "creatorType",
      null::varchar(120) as segment,
      null::text as "websiteUrl",
      ${creatorProfiles.whatsappContactCount} as "whatsappContactCount",
      ${creatorNichesProjection()} as niches,
      ${creatorSocialPlatformsProjection()} as "socialPlatforms",
      ${creatorMetricsProjection()} as metrics
    from ${creatorProfiles}
    inner join ${accounts} on ${accounts.id} = ${creatorProfiles.accountId}
    where ${sql.join(predicates, sql` and `)}
  `;
}

function buildCompanyBranch(filters: DirectoryQuery, viewer: CatalogViewer) {
  const predicates: SQL[] = [
    sql`${accounts.role} = 'COMPANY'`,
    sql`${accounts.status} = 'APPROVED'`,
    sql`${accounts.completionPercentage} = 100`,
    sql`${accounts.archivedAt} is null`,
    sql`${companyProfiles.archivedAt} is null`,
    sql`${companyProfiles.accountId} <> ${viewer.accountId}`,
    sql`length(trim(${companyProfiles.tradeName})) > 0`,
  ];

  if (filters.search) {
    const normalizedSearch = sql`public.normalize_search_text(${filters.search})`;
    predicates.push(sql`
      ${companyProfiles.searchDocument} like '%' || ${normalizedSearch} || '%'
    `);
  }

  if (filters.segment) {
    predicates.push(sql`${companyProfiles.segment} = ${filters.segment}`);
  }

  if (filters.city) {
    predicates.push(sql`
      exists (
        select 1 from ${companyLocations}
        where ${companyLocations.companyProfileId} = ${companyProfiles.id}
          and ${companyLocations.archivedAt} is null
          and public.normalize_search_text(${companyLocations.city}) = public.normalize_search_text(${filters.city})
      )
    `);
  }

  if (filters.state) {
    predicates.push(sql`
      exists (
        select 1 from ${companyLocations}
        where ${companyLocations.companyProfileId} = ${companyProfiles.id}
          and ${companyLocations.archivedAt} is null
          and ${companyLocations.state} = ${filters.state}
      )
    `);
  }

  if (filters.cursor) {
    predicates.push(
      cursorPredicate(
        sql`${companyProfiles.createdAt}`,
        sql`${companyProfiles.id}`,
        filters.cursor,
      ),
    );
  }

  return sql`
    select
      'COMPANY'::text as kind,
      ${companyProfiles.id} as id,
      to_jsonb(${companyProfiles.createdAt}) #>> '{}' as "createdAt",
      ${companyProfiles.tradeName} as "displayName",
      (
        select ${companyLocations.city}
        from ${companyLocations}
        where ${companyLocations.companyProfileId} = ${companyProfiles.id}
          and ${companyLocations.archivedAt} is null
        order by ${companyLocations.isPrimary} desc, ${companyLocations.id}
        limit 1
      ) as city,
      (
        select ${companyLocations.state}
        from ${companyLocations}
        where ${companyLocations.companyProfileId} = ${companyProfiles.id}
          and ${companyLocations.archivedAt} is null
        order by ${companyLocations.isPrimary} desc, ${companyLocations.id}
        limit 1
      ) as state,
      case
        when ${companyProfiles.description} is null then null
        else left(${companyProfiles.description}, ${DESCRIPTION_EXCERPT_LENGTH})
      end as description,
      ${companyProfiles.logoAssetId} as "primaryAssetId",
      ${companyProfiles.coverAssetId} as "coverAssetId",
      null::text as "creatorType",
      ${companyProfiles.segment} as segment,
      ${companyProfiles.websiteUrl} as "websiteUrl",
      0 as "whatsappContactCount",
      '[]'::jsonb as niches,
      '[]'::jsonb as "socialPlatforms",
      '[]'::jsonb as metrics
    from ${companyProfiles}
    inner join ${accounts} on ${accounts.id} = ${companyProfiles.accountId}
    where ${sql.join(predicates, sql` and `)}
  `;
}

interface DirectoryRow {
  city: string | null;
  coverAssetId: string | null;
  createdAt: Date | string;
  creatorType: "INFLUENCER" | "UGC" | null;
  description: string | null;
  displayName: string;
  id: string;
  kind: "COMPANY" | "CREATOR";
  metrics: CatalogCardMetricDto[];
  niches: CatalogNicheDto[];
  primaryAssetId: string | null;
  segment: string | null;
  socialPlatforms: CatalogSocialPlatform[];
  state: string | null;
  websiteUrl: string | null;
  whatsappContactCount: number;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function toDirectoryEntry(row: DirectoryRow): DirectoryEntryDto {
  const createdAt = toIsoString(row.createdAt);

  if (row.kind === "COMPANY") {
    return {
      city: row.city,
      companyId: row.id,
      createdAt,
      description: row.description,
      displayName: row.displayName,
      kind: "COMPANY",
      logoAssetId: row.primaryAssetId,
      segment: row.segment,
      state: row.state,
      websiteUrl: row.websiteUrl,
    };
  }

  return {
    avatarAssetId: row.primaryAssetId,
    bioExcerpt: row.description,
    city: row.city,
    coverAssetId: row.coverAssetId,
    createdAt,
    creatorId: row.id,
    creatorType: row.creatorType ?? "INFLUENCER",
    displayName: row.displayName,
    kind: "CREATOR",
    metrics: row.metrics,
    niches: row.niches,
    socialPlatforms: row.socialPlatforms,
    state: row.state,
    whatsappContactCount: row.whatsappContactCount,
  };
}

export async function listDirectoryPage(
  transaction: ApplicationTransaction,
  filters: DirectoryQuery,
  viewer: CatalogViewer,
): Promise<DirectoryPageDto> {
  const includeCompany =
    (!filters.type || filters.type.includes("COMPANY")) &&
    !hasMetricRangeFilter(filters) &&
    !filters.platform &&
    !filters.niche;
  const includeCreators =
    !filters.type ||
    filters.type.includes("INFLUENCER") ||
    filters.type.includes("UGC");

  const branches: SQL[] = [];
  if (includeCreators) {
    branches.push(buildCreatorBranch(filters, viewer));
  }
  if (includeCompany) {
    branches.push(buildCompanyBranch(filters, viewer));
  }

  const [rows, facets] = await Promise.all([
    branches.length === 0
      ? Promise.resolve([] as DirectoryRow[])
      : (transaction.execute(sql`
          select * from (
            ${sql.join(branches, sql` union all `)}
          ) combined
          order by "createdAt" asc, id asc
          limit ${filters.pageSize + 1}
        `) as unknown as Promise<DirectoryRow[]>),
    listDirectoryFacets(transaction),
  ]);

  const hasNextPage = rows.length > filters.pageSize;
  const pageRows = hasNextPage ? rows.slice(0, filters.pageSize) : rows;
  const lastItem = pageRows.at(-1);

  return {
    facets,
    items: pageRows.map(toDirectoryEntry),
    nextCursor:
      hasNextPage && lastItem
        ? encodeDirectoryCursor({
            createdAt: toIsoString(lastItem.createdAt),
            id: lastItem.id,
            kind: lastItem.kind,
          })
        : null,
    pageSize: filters.pageSize,
  };
}

async function listDirectoryLocationFacets(
  transaction: ApplicationTransaction,
  column: "city" | "state",
) {
  const companyColumn =
    column === "city" ? companyLocations.city : companyLocations.state;
  const creatorColumn =
    column === "city" ? creatorProfiles.city : creatorProfiles.state;

  const rows = (await transaction.execute(sql`
    select distinct value from (
      select ${creatorColumn} as value
      from ${creatorProfiles}
      inner join ${accounts} on ${accounts.id} = ${creatorProfiles.accountId}
      where ${accounts.role} = 'INFLUENCER'
        and ${accounts.status} = 'APPROVED'
        and ${accounts.archivedAt} is null
        and ${creatorProfiles.archivedAt} is null
        and ${creatorColumn} is not null
      union
      select ${companyColumn} as value
      from ${companyLocations}
      inner join ${companyProfiles} on ${companyProfiles.id} = ${companyLocations.companyProfileId}
      inner join ${accounts} on ${accounts.id} = ${companyProfiles.accountId}
      where ${accounts.role} = 'COMPANY'
        and ${accounts.status} = 'APPROVED'
        and ${accounts.archivedAt} is null
        and ${companyProfiles.archivedAt} is null
        and ${companyLocations.archivedAt} is null
        and ${companyColumn} is not null
    ) combined
    order by value
  `)) as unknown as { value: string }[];

  return rows.map((row) => row.value);
}

async function listDirectoryFacets(
  transaction: ApplicationTransaction,
): Promise<DirectoryFacetsDto> {
  const [cities, states, segments, nicheRows] = await Promise.all([
    listDirectoryLocationFacets(transaction, "city"),
    listDirectoryLocationFacets(transaction, "state"),
    listCompanySegmentFacets(transaction),
    transaction
      .select({ name: niches.name, slug: niches.slug })
      .from(niches)
      .where(eq(niches.isActive, true))
      .orderBy(asc(niches.sortOrder), asc(niches.name), asc(niches.id)),
  ]);

  return { cities, niches: nicheRows, segments, states };
}
