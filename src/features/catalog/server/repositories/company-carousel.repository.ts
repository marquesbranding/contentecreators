import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import { accounts, companyProfiles, mediaAssets } from "@/db/schema";

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
      logoAssetId: mediaAssets.id,
      tradeName: companyProfiles.tradeName,
      websiteUrl: companyProfiles.websiteUrl,
    })
    .from(companyProfiles)
    .innerJoin(accounts, eq(accounts.id, companyProfiles.accountId))
    .innerJoin(
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
        eq(accounts.completionPercentage, 100),
        isNull(accounts.archivedAt),
        isNull(companyProfiles.archivedAt),
        sql`length(trim(${companyProfiles.tradeName})) > 0`,
      ),
    )
    .orderBy(asc(companyProfiles.tradeName), asc(companyProfiles.id))
    .limit(limit);

  return rows.map((row) =>
    companyCarouselItemSchema.parse({
      displayName: row.tradeName,
      logo: {
        alt: `Logo da ${row.tradeName}`,
        assetId: row.logoAssetId,
      },
      websiteUrl: toSafeCompanyWebsiteUrl(row.websiteUrl),
    }),
  );
}
