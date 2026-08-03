import "server-only";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  accounts,
  companyLocations,
  companyProfiles,
  mediaAssets,
} from "@/db/schema";

import { toSafeCompanyWebsiteUrl } from "../../schemas/company-carousel.schema";
import type { FindEligibleCompanyDetail } from "./company-detail.repository";

export const findEligibleCompanyDetail: FindEligibleCompanyDetail = async (
  transaction,
  companyId,
) => {
  const [company] = await transaction
    .select({
      accountId: companyProfiles.accountId,
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
      coverAssetId: companyProfiles.coverAssetId,
      description: companyProfiles.description,
      email: accounts.operationalEmail,
      logoAssetId: companyProfiles.logoAssetId,
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
    .where(
      and(
        eq(companyProfiles.id, companyId),
        eq(accounts.role, "COMPANY"),
        eq(accounts.status, "APPROVED"),
        isNull(accounts.archivedAt),
        isNull(companyProfiles.archivedAt),
        sql`length(trim(${companyProfiles.tradeName})) > 0`,
      ),
    )
    .limit(1);

  if (!company) {
    return null;
  }

  const assetIds = [company.logoAssetId, company.coverAssetId].filter(
    (value): value is string => Boolean(value),
  );
  const media =
    assetIds.length === 0
      ? []
      : await transaction
          .select({
            id: mediaAssets.id,
            kind: mediaAssets.kind,
          })
          .from(mediaAssets)
          .where(
            and(
              inArray(mediaAssets.id, assetIds),
              eq(mediaAssets.ownerAccountId, company.accountId),
              inArray(mediaAssets.kind, ["LOGO", "COVER"]),
              eq(mediaAssets.status, "ACTIVE"),
              isNull(mediaAssets.archivedAt),
              isNull(mediaAssets.replacedByAssetId),
            ),
          )
          .orderBy(asc(mediaAssets.kind), asc(mediaAssets.id));

  return {
    city: company.city,
    companyId: company.companyId,
    coverAssetId: company.coverAssetId,
    description: company.description,
    displayName: company.tradeName,
    email: company.email,
    logoAssetId: company.logoAssetId,
    media: media.map(({ id, kind }) => ({
      id,
      kind: kind as "COVER" | "LOGO",
    })),
    segment: company.segment,
    state: company.state,
    websiteUrl: toSafeCompanyWebsiteUrl(company.websiteUrl),
    whatsappE164: company.whatsappE164,
  };
};
