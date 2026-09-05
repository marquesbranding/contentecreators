import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  sql,
} from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import {
  accountContactPreferences,
  accounts,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  legalDocuments,
  mediaAssets,
  niches,
  socialProfiles,
} from "@/db/schema";

import type {
  CatalogCreatorContactRecord,
  CatalogCreatorDetailRecord,
  FindEligibleCatalogCreator,
} from "./catalog-detail.repository";

async function loadPresentationCollections(
  transaction: ApplicationTransaction,
  profile: {
    accountId: string;
    avatarAssetId: string | null;
    coverAssetId: string | null;
    creatorId: string;
  },
) {
  const nicheRows = await transaction
    .select({
      name: niches.name,
      slug: niches.slug,
    })
    .from(creatorNiches)
    .innerJoin(niches, eq(niches.id, creatorNiches.nicheId))
    .where(
      and(
        eq(creatorNiches.creatorProfileId, profile.creatorId),
        eq(niches.isActive, true),
      ),
    )
    .orderBy(asc(niches.sortOrder), asc(niches.name), asc(niches.id));
  const socialRows = await transaction
    .select({
      handle: socialProfiles.handle,
      normalizedUrl: socialProfiles.normalizedUrl,
      platform: socialProfiles.platform,
    })
    .from(socialProfiles)
    .where(
      and(
        eq(socialProfiles.ownerAccountId, profile.accountId),
        eq(socialProfiles.isVisibleInCatalog, true),
        isNull(socialProfiles.archivedAt),
      ),
    )
    .orderBy(asc(socialProfiles.sortOrder), asc(socialProfiles.id));
  const metricRows = await transaction
    .select({
      engagementRate: creatorMetricSnapshots.engagementRate,
      followerCount: creatorMetricSnapshots.followerCount,
      interactionCount: creatorMetricSnapshots.interactionCount,
      isPrimary: sql<boolean>`coalesce(${socialProfiles.isPrimary}, false)`,
      newFollowerCount: creatorMetricSnapshots.newFollowerCount,
      observedOn: creatorMetricSnapshots.observedOn,
      platform: creatorMetricSnapshots.platform,
      sharedContentDescription: creatorMetricSnapshots.sharedContentDescription,
      source: creatorMetricSnapshots.source,
      viewCount: creatorMetricSnapshots.viewCount,
    })
    .from(creatorMetricSnapshots)
    .leftJoin(
      socialProfiles,
      eq(socialProfiles.id, creatorMetricSnapshots.socialProfileId),
    )
    .where(eq(creatorMetricSnapshots.creatorProfileId, profile.creatorId))
    .orderBy(
      asc(creatorMetricSnapshots.platform),
      desc(creatorMetricSnapshots.observedOn),
      desc(creatorMetricSnapshots.createdAt),
      desc(creatorMetricSnapshots.id),
    );
  const assetIds = [profile.avatarAssetId, profile.coverAssetId].filter(
    (value): value is string => Boolean(value),
  );
  const mediaRows =
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
              eq(mediaAssets.ownerAccountId, profile.accountId),
              eq(mediaAssets.status, "ACTIVE"),
              inArray(mediaAssets.kind, ["AVATAR", "COVER"]),
              isNull(mediaAssets.archivedAt),
            ),
          )
          .orderBy(asc(mediaAssets.kind), asc(mediaAssets.id));

  return {
    media: mediaRows.map(({ id, kind }) => ({
      id,
      kind: kind as "AVATAR" | "COVER",
    })),
    metrics: metricRows,
    niches: nicheRows,
    socialProfiles: socialRows,
  };
}

async function loadCompanyContact(
  transaction: ApplicationTransaction,
  accountId: string,
): Promise<CatalogCreatorContactRecord | null> {
  /*
   * The active preference is the deliberately narrow consent projection made
   * visible to approved companies by RLS. Its FK binds it to the currently
   * active CONTACT_VISIBILITY document without exposing account_consents or
   * its request/network/user-agent context.
   */
  const [contact] = await transaction
    .select({
      email: accounts.operationalEmail,
      emailVisible: accountContactPreferences.emailVisibleToApprovedCompanies,
      socialVisible: accountContactPreferences.socialVisibleToApprovedCompanies,
      whatsappE164: creatorProfiles.whatsappE164,
      whatsappVisible:
        accountContactPreferences.whatsappVisibleToApprovedCompanies,
    })
    .from(creatorProfiles)
    .innerJoin(accounts, eq(accounts.id, creatorProfiles.accountId))
    .innerJoin(
      accountContactPreferences,
      eq(accountContactPreferences.accountId, accounts.id),
    )
    .innerJoin(
      legalDocuments,
      eq(legalDocuments.id, accountContactPreferences.consentDocumentId),
    )
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.role, "INFLUENCER"),
        eq(accounts.status, "APPROVED"),
        isNull(accounts.archivedAt),
        isNull(creatorProfiles.archivedAt),
        isNull(accountContactPreferences.archivedAt),
        eq(legalDocuments.documentType, "CONTACT_VISIBILITY"),
        lte(legalDocuments.activeFrom, new Date()),
        isNull(legalDocuments.retiredAt),
      ),
    )
    .limit(1);

  return contact
    ? {
        consentIsActive: true,
        ...contact,
      }
    : null;
}

export const findEligibleCatalogCreator: FindEligibleCatalogCreator = async (
  transaction,
  creatorId,
  viewer,
) => {
  const eligibilityPredicates = [
    eq(creatorProfiles.id, creatorId),
    eq(accounts.role, "INFLUENCER"),
    eq(accounts.status, "APPROVED"),
    isNull(accounts.archivedAt),
    isNull(creatorProfiles.archivedAt),
    isNotNull(creatorProfiles.bio),
    isNotNull(creatorProfiles.city),
    isNotNull(creatorProfiles.state),
  ];

  if (viewer.role === "INFLUENCER") {
    eligibilityPredicates.push(ne(creatorProfiles.accountId, viewer.accountId));
  }

  const [profile] = await transaction
    .select({
      accountId: creatorProfiles.accountId,
      avatarAssetId: creatorProfiles.avatarAssetId,
      bio: creatorProfiles.bio,
      city: creatorProfiles.city,
      coverAssetId: creatorProfiles.coverAssetId,
      creatorId: creatorProfiles.id,
      creatorType: creatorProfiles.creatorType,
      displayName: creatorProfiles.displayName,
      state: creatorProfiles.state,
      whatsappContactCount: creatorProfiles.whatsappContactCount,
    })
    .from(creatorProfiles)
    .innerJoin(accounts, eq(accounts.id, creatorProfiles.accountId))
    .where(and(...eligibilityPredicates))
    .limit(1);

  if (!profile?.bio || !profile.city || !profile.state) {
    return null;
  }

  const presentation = await loadPresentationCollections(transaction, profile);
  const contact =
    viewer.role === "COMPANY"
      ? await loadCompanyContact(transaction, profile.accountId)
      : null;

  return {
    ...profile,
    bio: profile.bio,
    city: profile.city,
    contact,
    state: profile.state,
    ...presentation,
  } satisfies CatalogCreatorDetailRecord;
};
