import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { getDatabaseClient, type ApplicationDatabase } from "@/db/client";
import { accounts, companyLocations, companyProfiles } from "@/db/schema";

import type { PublicCommunityProofDto } from "../../types/public-community-proof.types";

const PUBLIC_PROOF_COMPANY_LIMIT = 10;

/** Approved companies for the landing's brand-name marquee. */
export async function loadPublicCommunityProof(
  database: ApplicationDatabase,
): Promise<PublicCommunityProofDto> {
  const companies = await database
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
        // Same bar as the catalog directory and carousel: an approved but
        // incomplete company is hidden inside the product, so it must not
        // be promoted on the public page either.
        eq(accounts.completionPercentage, 100),
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
    .limit(PUBLIC_PROOF_COMPANY_LIMIT);

  return { companies };
}

export function loadServerPublicCommunityProof() {
  return loadPublicCommunityProof(getDatabaseClient().database);
}
