import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import {
  accounts,
  companyLocations,
  companyProfiles,
  mediaAssets,
} from "@/db/schema";

import {
  companyCarouselItemSchema,
  toSafeCompanyWebsiteUrl,
} from "../../schemas/company-carousel.schema";
import type { CompanyCarouselItemDto } from "../../types/company-carousel.types";

export interface CompanyCarouselFilters {
  search?: string;
  segment?: string;
}

export interface CompanyCarouselRepository {
  listEligibleCompanies(
    transaction: ApplicationTransaction,
    limit: number,
    filters?: CompanyCarouselFilters,
  ): Promise<CompanyCarouselItemDto[]>;
  listCompanySegmentFacets(
    transaction: ApplicationTransaction,
  ): Promise<string[]>;
}

const eligibleCompanyPredicates = [
  eq(accounts.role, "COMPANY"),
  eq(accounts.status, "APPROVED"),
  eq(accounts.completionPercentage, 100),
  isNull(accounts.archivedAt),
  isNull(companyProfiles.archivedAt),
  sql`length(trim(${companyProfiles.tradeName})) > 0`,
];

export async function listCompanySegmentFacets(
  transaction: ApplicationTransaction,
): Promise<string[]> {
  const rows = await transaction
    .selectDistinct({ segment: companyProfiles.segment })
    .from(companyProfiles)
    .innerJoin(accounts, eq(accounts.id, companyProfiles.accountId))
    .where(and(...eligibleCompanyPredicates))
    .orderBy(asc(companyProfiles.segment));

  return rows
    .map((row) => row.segment?.trim())
    .filter((segment): segment is string => Boolean(segment));
}

export async function listEligibleCarouselCompanies(
  transaction: ApplicationTransaction,
  limit: number,
  filters: CompanyCarouselFilters = {},
): Promise<CompanyCarouselItemDto[]> {
  const predicates = [...eligibleCompanyPredicates];

  if (filters.search) {
    const normalizedSearch = sql`public.normalize_search_text(${filters.search})`;
    predicates.push(sql`
      ${companyProfiles.searchDocument} like '%' || ${normalizedSearch} || '%'
      and (
        public.normalize_search_text(${companyProfiles.tradeName}) like '%' || ${normalizedSearch} || '%'
        or public.normalize_search_text(${companyProfiles.legalName}) like '%' || ${normalizedSearch} || '%'
        or public.normalize_search_text(${companyProfiles.segment}) like '%' || ${normalizedSearch} || '%'
      )
    `);
  }

  if (filters.segment) {
    predicates.push(eq(companyProfiles.segment, filters.segment));
  }

  const rows = await transaction
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
      description: sql<string | null>`
        case
          when ${companyProfiles.description} is null then null
          else left(${companyProfiles.description}, 220)
        end
      `,
      email: accounts.operationalEmail,
      logoAssetId: mediaAssets.id,
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
      websiteUrl: companyProfiles.websiteUrl,
      whatsappE164: companyProfiles.whatsappE164,
    })
    .from(companyProfiles)
    .innerJoin(accounts, eq(accounts.id, companyProfiles.accountId))
    .leftJoin(
      mediaAssets,
      and(
        eq(mediaAssets.id, companyProfiles.logoAssetId),
        eq(mediaAssets.ownerAccountId, companyProfiles.accountId),
        eq(mediaAssets.kind, "LOGO"),
        eq(mediaAssets.status, "ACTIVE"),
        isNull(mediaAssets.archivedAt),
        isNull(mediaAssets.replacedByAssetId),
      ),
    )
    .where(and(...predicates))
    .orderBy(asc(companyProfiles.tradeName), asc(companyProfiles.id))
    .limit(limit);

  return rows.map((row) =>
    companyCarouselItemSchema.parse({
      city: row.city,
      companyId: row.companyId,
      description: row.description,
      displayName: row.tradeName,
      email: row.email,
      logo: row.logoAssetId
        ? {
            alt: `Logo da ${row.tradeName}`,
            assetId: row.logoAssetId,
          }
        : null,
      segment: row.segment,
      state: row.state,
      websiteUrl: toSafeCompanyWebsiteUrl(row.websiteUrl),
      whatsappE164: row.whatsappE164,
    }),
  );
}
