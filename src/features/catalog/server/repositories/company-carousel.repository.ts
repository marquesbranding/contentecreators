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

export interface CompanyCarouselRepository {
  listEligibleCompanies(
    transaction: ApplicationTransaction,
    limit: number,
  ): Promise<CompanyCarouselItemDto[]>;
}

export async function listEligibleCarouselCompanies(
  transaction: ApplicationTransaction,
  limit: number,
): Promise<CompanyCarouselItemDto[]> {
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
    .where(
      and(
        eq(accounts.role, "COMPANY"),
        eq(accounts.status, "APPROVED"),
        isNull(accounts.archivedAt),
        isNull(companyProfiles.archivedAt),
        sql`length(trim(${companyProfiles.tradeName})) > 0`,
      ),
    )
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
