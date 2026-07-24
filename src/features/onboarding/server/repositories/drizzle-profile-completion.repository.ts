import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import {
  accounts,
  companyLocations,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  mediaAssets,
  niches,
  socialProfiles,
} from "@/db/schema";

import {
  calculateProfileCompletion,
  PROFILE_COMPLETION_VERSION,
  type CompanyProfileCompletionInput,
  type CreatorProfileCompletionInput,
  type ProfileCompletionMediaInput,
  type ProfileCompletionRole,
  type ProfileCompletionResult,
} from "../../domain/profile-completion";

export interface ProfileCompletionAggregateDto {
  averagePercentage: number;
  profileCount: number;
  version: typeof PROFILE_COMPLETION_VERSION;
}

async function loadAccount(
  transaction: ApplicationTransaction,
  accountId: string,
) {
  const [account] = await transaction
    .select({
      completionPercentage: accounts.completionPercentage,
      completionVersion: accounts.completionVersion,
      id: accounts.id,
      role: accounts.role,
    })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), isNull(accounts.archivedAt)))
    .limit(1);

  if (
    !account ||
    (account.role !== "INFLUENCER" && account.role !== "COMPANY")
  ) {
    throw new Error("Profile completion account was not found.");
  }

  return account;
}

async function loadMedia(
  transaction: ApplicationTransaction,
  accountId: string,
  assetIds: (string | null)[],
) {
  const requestedIds = assetIds.filter((id): id is string => Boolean(id));

  if (requestedIds.length === 0) {
    return [];
  }

  return transaction
    .select({
      archivedAt: mediaAssets.archivedAt,
      id: mediaAssets.id,
      kind: mediaAssets.kind,
      ownerAccountId: mediaAssets.ownerAccountId,
      status: mediaAssets.status,
    })
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, requestedIds))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        ownerMatches: row.ownerAccountId === accountId,
      })),
    );
}

function mediaInput(
  rows: Awaited<ReturnType<typeof loadMedia>>,
  assetId: string | null,
): ProfileCompletionMediaInput | undefined {
  if (!assetId) {
    return undefined;
  }

  const row = rows.find((candidate) => candidate.id === assetId);

  if (!row) {
    return undefined;
  }

  return {
    archivedAt: row.archivedAt,
    kind:
      row.kind === "AVATAR" || row.kind === "LOGO" || row.kind === "COVER"
        ? row.kind
        : undefined,
    ownerMatches: row.ownerMatches,
    status:
      row.status === "PENDING" ||
      row.status === "ACTIVE" ||
      row.status === "ARCHIVED"
        ? row.status
        : undefined,
  };
}

async function loadSocialProfiles(
  transaction: ApplicationTransaction,
  accountId: string,
) {
  return transaction
    .select({
      archivedAt: socialProfiles.archivedAt,
      normalizedUrl: socialProfiles.normalizedUrl,
      platform: socialProfiles.platform,
    })
    .from(socialProfiles)
    .where(eq(socialProfiles.ownerAccountId, accountId));
}

async function loadCreatorCompletionInput(
  transaction: ApplicationTransaction,
  account: Awaited<ReturnType<typeof loadAccount>>,
): Promise<CreatorProfileCompletionInput> {
  const [profile] = await transaction
    .select()
    .from(creatorProfiles)
    .where(
      and(
        eq(creatorProfiles.accountId, account.id),
        isNull(creatorProfiles.archivedAt),
      ),
    )
    .limit(1);

  if (!profile) {
    return {
      emailVerified: true,
      role: "INFLUENCER",
    };
  }

  const [selectedNiches, social, metrics, media] = await Promise.all([
    transaction
      .select({ slug: niches.slug })
      .from(creatorNiches)
      .innerJoin(niches, eq(niches.id, creatorNiches.nicheId))
      .where(
        and(
          eq(creatorNiches.creatorProfileId, profile.id),
          eq(niches.isActive, true),
        ),
      ),
    loadSocialProfiles(transaction, account.id),
    transaction
      .select({
        engagementRate: creatorMetricSnapshots.engagementRate,
        followerCount: creatorMetricSnapshots.followerCount,
        observedOn: creatorMetricSnapshots.observedOn,
      })
      .from(creatorMetricSnapshots)
      .where(eq(creatorMetricSnapshots.creatorProfileId, profile.id)),
    loadMedia(transaction, account.id, [
      profile.avatarAssetId,
      profile.coverAssetId,
    ]),
  ]);

  return {
    avatar: mediaInput(media, profile.avatarAssetId),
    bio: profile.bio,
    city: profile.city,
    cover: mediaInput(media, profile.coverAssetId),
    creatorType: profile.creatorType,
    displayName: profile.displayName,
    emailVerified: true,
    legalName: profile.legalName,
    metricSnapshots: metrics,
    nicheSlugs: selectedNiches.map((niche) => niche.slug),
    role: "INFLUENCER",
    socialProfiles: social,
    state: profile.state,
    whatsapp: profile.whatsappE164,
  };
}

async function loadCompanyCompletionInput(
  transaction: ApplicationTransaction,
  account: Awaited<ReturnType<typeof loadAccount>>,
): Promise<CompanyProfileCompletionInput> {
  const [profile] = await transaction
    .select()
    .from(companyProfiles)
    .where(
      and(
        eq(companyProfiles.accountId, account.id),
        isNull(companyProfiles.archivedAt),
      ),
    )
    .limit(1);

  if (!profile) {
    return {
      emailVerified: true,
      role: "COMPANY",
    };
  }

  const [locations, social, media] = await Promise.all([
    transaction
      .select({
        city: companyLocations.city,
        isPrimary: companyLocations.isPrimary,
        neighborhood: companyLocations.neighborhood,
        number: companyLocations.number,
        postalCode: companyLocations.postalCode,
        state: companyLocations.state,
        street: companyLocations.street,
      })
      .from(companyLocations)
      .where(
        and(
          eq(companyLocations.companyProfileId, profile.id),
          isNull(companyLocations.archivedAt),
        ),
      ),
    loadSocialProfiles(transaction, account.id),
    loadMedia(transaction, account.id, [
      profile.logoAssetId,
      profile.coverAssetId,
    ]),
  ]);
  const primaryLocation = locations.find((location) => location.isPrimary);

  return {
    additionalLocations: locations.filter((location) => !location.isPrimary),
    cnpj: profile.cnpj,
    cover: mediaInput(media, profile.coverAssetId),
    description: profile.description,
    emailVerified: true,
    employeeRange: profile.employeeRange,
    legalName: profile.legalName,
    logo: mediaInput(media, profile.logoAssetId),
    primaryLocation,
    role: "COMPANY",
    segment: profile.segment,
    socialProfiles: social,
    tradeName: profile.tradeName,
    websiteUrl: profile.websiteUrl,
    whatsapp: profile.whatsappE164,
  };
}

export async function calculateProfileCompletionForAccount(
  transaction: ApplicationTransaction,
  accountId: string,
  expectedRole?: ProfileCompletionRole,
): Promise<ProfileCompletionResult> {
  const account = await loadAccount(transaction, accountId);

  if (expectedRole && account.role !== expectedRole) {
    throw new Error("Profile completion role does not match the account.");
  }

  return account.role === "COMPANY"
    ? calculateProfileCompletion(
        await loadCompanyCompletionInput(transaction, account),
      )
    : calculateProfileCompletion(
        await loadCreatorCompletionInput(transaction, account),
      );
}

export async function persistProfileCompletionDirect(
  transaction: ApplicationTransaction,
  accountId: string,
  role: ProfileCompletionRole,
): Promise<ProfileCompletionResult> {
  const result = await calculateProfileCompletionForAccount(
    transaction,
    accountId,
    role,
  );

  await transaction
    .update(accounts)
    .set({
      completionPercentage: result.percentage,
      completionVersion: result.version,
    })
    .where(
      and(
        eq(accounts.id, accountId),
        sql`(
          ${accounts.completionPercentage} is distinct from ${result.percentage}
          or ${accounts.completionVersion} is distinct from ${result.version}
        )`,
      ),
    );

  return result;
}

export async function persistCurrentAccountProfileCompletion(
  transaction: ApplicationTransaction,
  accountId: string,
  role: ProfileCompletionRole,
): Promise<ProfileCompletionResult> {
  const result = await calculateProfileCompletionForAccount(
    transaction,
    accountId,
    role,
  );

  await transaction.execute(sql`
    select public.app_set_profile_completion(
      ${accountId}::uuid,
      ${role}::public.account_role,
      ${result.percentage}::smallint,
      ${result.version}::integer
    )
  `);

  return result;
}

export async function loadProfileCompletionAggregate(
  transaction: ApplicationTransaction,
  role?: ProfileCompletionRole,
): Promise<ProfileCompletionAggregateDto> {
  const conditions = [
    isNull(accounts.archivedAt),
    eq(accounts.completionVersion, PROFILE_COMPLETION_VERSION),
    inArray(accounts.role, ["INFLUENCER", "COMPANY"]),
  ];

  if (role) {
    conditions.push(eq(accounts.role, role));
  }

  const [aggregate] = await transaction
    .select({
      averagePercentage: sql<number>`coalesce(round(avg(${accounts.completionPercentage})), 0)::integer`,
      profileCount: sql<number>`count(*)::integer`,
    })
    .from(accounts)
    .where(and(...conditions));

  return {
    averagePercentage: aggregate?.averagePercentage ?? 0,
    profileCount: aggregate?.profileCount ?? 0,
    version: PROFILE_COMPLETION_VERSION,
  };
}
