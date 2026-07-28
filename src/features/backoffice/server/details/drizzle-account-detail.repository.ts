import "server-only";

import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";

import {
  accountConsents,
  accountContactPreferences,
  accounts,
  companyLocations,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  legalDocuments,
  mediaAssets,
  moderationCases,
  moderationEvents,
  niches,
  socialProfiles,
} from "@/db/schema";
import {
  requireAdmin,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  BackofficeAccountDetailDto,
  BackofficeAccountProfileDto,
  BackofficeCompanyEditableProfileDto,
} from "../../types/account-detail.types";
import type { AccountDetailRepository } from "./account-detail.service";

function toIso(value: Date | null) {
  return value?.toISOString() ?? null;
}

async function loadInfluencerProfile(
  transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
  accountId: string,
): Promise<BackofficeAccountProfileDto | null> {
  const [profile] = await transaction
    .select({
      avatarAssetId: creatorProfiles.avatarAssetId,
      bio: creatorProfiles.bio,
      city: creatorProfiles.city,
      coverAssetId: creatorProfiles.coverAssetId,
      creatorType: creatorProfiles.creatorType,
      displayName: creatorProfiles.displayName,
      id: creatorProfiles.id,
      legalName: creatorProfiles.legalName,
      state: creatorProfiles.state,
      version: creatorProfiles.version,
      whatsappE164: creatorProfiles.whatsappE164,
    })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.accountId, accountId))
    .limit(1);

  if (!profile) {
    return null;
  }

  const [selectedNiches, socialRows, metricRows] = await Promise.all([
    transaction
      .select({ name: niches.name, slug: niches.slug })
      .from(creatorNiches)
      .innerJoin(niches, eq(niches.id, creatorNiches.nicheId))
      .where(eq(creatorNiches.creatorProfileId, profile.id))
      .orderBy(asc(niches.sortOrder), asc(niches.slug)),
    transaction
      .select({
        id: socialProfiles.id,
        normalizedUrl: socialProfiles.normalizedUrl,
        platform: socialProfiles.platform,
      })
      .from(socialProfiles)
      .where(
        and(
          eq(socialProfiles.ownerAccountId, accountId),
          isNull(socialProfiles.archivedAt),
        ),
      )
      .orderBy(asc(socialProfiles.sortOrder), asc(socialProfiles.id)),
    transaction
      .select({
        engagementRate: creatorMetricSnapshots.engagementRate,
        followerCount: creatorMetricSnapshots.followerCount,
        observedOn: creatorMetricSnapshots.observedOn,
        platform: creatorMetricSnapshots.platform,
        socialProfileId: creatorMetricSnapshots.socialProfileId,
      })
      .from(creatorMetricSnapshots)
      .where(eq(creatorMetricSnapshots.creatorProfileId, profile.id))
      .orderBy(
        desc(creatorMetricSnapshots.observedOn),
        desc(creatorMetricSnapshots.createdAt),
        desc(creatorMetricSnapshots.id),
      )
      .limit(100),
  ]);
  const social = socialRows[0];
  const metrics = metricRows.map((metric) => ({
    engagementRate:
      metric.engagementRate === null ? null : Number(metric.engagementRate),
    followerCount: metric.followerCount,
    observedOn: metric.observedOn.toISOString().slice(0, 10),
    platform: metric.platform,
  }));

  if (!social) {
    return {
      editableProfile: null,
      kind: "INFLUENCER",
      niches: selectedNiches,
      selfReportedMetrics: metrics,
    };
  }

  const metric = metricRows.find(
    (row) =>
      row.socialProfileId === social.id && row.platform === social.platform,
  );

  if (!metric) {
    return {
      editableProfile: null,
      kind: "INFLUENCER",
      niches: selectedNiches,
      selfReportedMetrics: metrics,
    };
  }

  return {
    editableProfile: {
      avatarAssetId: profile.avatarAssetId,
      bio: profile.bio ?? "",
      city: profile.city ?? "",
      coverAssetId: profile.coverAssetId,
      creatorType: profile.creatorType,
      displayName: profile.displayName,
      engagementRate: Number(metric.engagementRate ?? 0),
      followers: metric.followerCount ?? 0,
      legalName: profile.legalName,
      nicheSlugs: selectedNiches.map((niche) => niche.slug),
      socialPlatform: social.platform,
      socialUrl: social.normalizedUrl,
      state: profile.state ?? "",
      version: profile.version,
      whatsapp: profile.whatsappE164 ?? "",
    },
    kind: "INFLUENCER",
    niches: selectedNiches,
    selfReportedMetrics: metrics,
  };
}

async function loadCompanyProfile(
  transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
  accountId: string,
): Promise<BackofficeAccountProfileDto | null> {
  const [profile] = await transaction
    .select({
      cnpj: companyProfiles.cnpj,
      coverAssetId: companyProfiles.coverAssetId,
      description: companyProfiles.description,
      employeeRange: companyProfiles.employeeRange,
      id: companyProfiles.id,
      legalName: companyProfiles.legalName,
      logoAssetId: companyProfiles.logoAssetId,
      segment: companyProfiles.segment,
      tradeName: companyProfiles.tradeName,
      version: companyProfiles.version,
      websiteUrl: companyProfiles.websiteUrl,
      whatsappE164: companyProfiles.whatsappE164,
    })
    .from(companyProfiles)
    .where(eq(companyProfiles.accountId, accountId))
    .limit(1);

  if (!profile) {
    return null;
  }

  const [locations, socialRows] = await Promise.all([
    transaction
      .select({
        city: companyLocations.city,
        complement: companyLocations.complement,
        isPrimary: companyLocations.isPrimary,
        label: companyLocations.label,
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
      )
      .orderBy(desc(companyLocations.isPrimary), asc(companyLocations.id)),
    transaction
      .select({
        normalizedUrl: socialProfiles.normalizedUrl,
        platform: socialProfiles.platform,
      })
      .from(socialProfiles)
      .where(
        and(
          eq(socialProfiles.ownerAccountId, accountId),
          isNull(socialProfiles.archivedAt),
        ),
      )
      .orderBy(asc(socialProfiles.sortOrder), asc(socialProfiles.id)),
  ]);
  const primaryLocation = locations.find((location) => location.isPrimary);
  const social = socialRows[0];

  if (!primaryLocation || !profile.employeeRange) {
    return { editableProfile: null, kind: "COMPANY" };
  }

  return {
    editableProfile: {
      additionalLocations: locations
        .filter((location) => !location.isPrimary)
        .map((location) => ({
          city: location.city,
          complement: location.complement ?? "",
          label: location.label,
          neighborhood: location.neighborhood ?? "",
          number: location.number,
          postalCode: location.postalCode ?? "",
          state: location.state,
          street: location.street,
        })),
      city: primaryLocation.city,
      cnpj: profile.cnpj,
      complement: primaryLocation.complement ?? "",
      coverAssetId: profile.coverAssetId,
      description: profile.description ?? "",
      employeeRange:
        profile.employeeRange as BackofficeCompanyEditableProfileDto["employeeRange"],
      legalName: profile.legalName,
      logoAssetId: profile.logoAssetId,
      neighborhood: primaryLocation.neighborhood ?? "",
      number: primaryLocation.number,
      postalCode: primaryLocation.postalCode ?? "",
      segment: profile.segment ?? "",
      socialPlatform: social?.platform,
      socialUrl: social?.normalizedUrl,
      state: primaryLocation.state,
      street: primaryLocation.street,
      tradeName: profile.tradeName,
      version: profile.version,
      websiteUrl: profile.websiteUrl ?? undefined,
      whatsapp: profile.whatsappE164 ?? "",
    },
    kind: "COMPANY",
  };
}

export function createDrizzleAccountDetailRepository({
  runVerifiedTransaction,
}: {
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}): AccountDetailRepository {
  return {
    findByAccountId(query) {
      return runVerifiedTransaction(
        { requestId: query.requestId },
        async (transaction, actor) => {
          requireAdmin({
            id: actor.accountId,
            role: actor.role,
            status: actor.status,
          });

          const [account] = await transaction
            .select({
              approvedAt: accounts.approvedAt,
              archivedAt: accounts.archivedAt,
              bannedAt: accounts.bannedAt,
              completionPercentage: accounts.completionPercentage,
              completionVersion: accounts.completionVersion,
              createdAt: accounts.createdAt,
              id: accounts.id,
              operationalEmail: accounts.operationalEmail,
              role: accounts.role,
              status: accounts.status,
              submittedAt: accounts.submittedAt,
              suspendedAt: accounts.suspendedAt,
              updatedAt: accounts.updatedAt,
              version: accounts.version,
            })
            .from(accounts)
            .where(eq(accounts.id, query.accountId))
            .limit(1);

          if (!account) {
            return null;
          }

          const [
            consentRows,
            contactPreferenceRows,
            mediaRows,
            socialRows,
            moderationCaseRows,
            profile,
          ] = await Promise.all([
            transaction
              .select({
                acceptedAt: accountConsents.acceptedAt,
                activeFrom: legalDocuments.activeFrom,
                contentHash: legalDocuments.contentHash,
                documentType: legalDocuments.documentType,
                retiredAt: legalDocuments.retiredAt,
                versionLabel: legalDocuments.versionLabel,
              })
              .from(accountConsents)
              .innerJoin(
                legalDocuments,
                eq(accountConsents.legalDocumentId, legalDocuments.id),
              )
              .where(eq(accountConsents.accountId, account.id))
              .orderBy(
                asc(legalDocuments.documentType),
                desc(accountConsents.acceptedAt),
              ),
            transaction
              .select({
                emailVisibleToApprovedCompanies:
                  accountContactPreferences.emailVisibleToApprovedCompanies,
                socialVisibleToApprovedCompanies:
                  accountContactPreferences.socialVisibleToApprovedCompanies,
                version: accountContactPreferences.version,
                whatsappVisibleToApprovedCompanies:
                  accountContactPreferences.whatsappVisibleToApprovedCompanies,
              })
              .from(accountContactPreferences)
              .where(
                and(
                  eq(accountContactPreferences.accountId, account.id),
                  isNull(accountContactPreferences.archivedAt),
                ),
              )
              .orderBy(desc(accountContactPreferences.updatedAt))
              .limit(1),
            transaction
              .select({
                archivedAt: mediaAssets.archivedAt,
                createdAt: mediaAssets.createdAt,
                height: mediaAssets.height,
                id: mediaAssets.id,
                kind: mediaAssets.kind,
                mimeType: mediaAssets.mimeType,
                replacedByAssetId: mediaAssets.replacedByAssetId,
                sizeBytes: mediaAssets.sizeBytes,
                status: mediaAssets.status,
                updatedAt: mediaAssets.updatedAt,
                version: mediaAssets.version,
                width: mediaAssets.width,
              })
              .from(mediaAssets)
              .where(
                and(
                  eq(mediaAssets.ownerAccountId, account.id),
                  ne(mediaAssets.kind, "SPONSORSHIP_CREATIVE"),
                ),
              )
              .orderBy(asc(mediaAssets.kind), desc(mediaAssets.updatedAt)),
            transaction
              .select({
                handle: socialProfiles.handle,
                normalizedUrl: socialProfiles.normalizedUrl,
                platform: socialProfiles.platform,
                version: socialProfiles.version,
              })
              .from(socialProfiles)
              .where(
                and(
                  eq(socialProfiles.ownerAccountId, account.id),
                  isNull(socialProfiles.archivedAt),
                ),
              )
              .orderBy(asc(socialProfiles.sortOrder), asc(socialProfiles.id)),
            transaction
              .select({
                assignedAdminAccountId: moderationCases.assignedAdminAccountId,
                currentSubmissionSequence:
                  moderationCases.currentSubmissionSequence,
                id: moderationCases.id,
                resolvedAt: moderationCases.resolvedAt,
                submittedAt: moderationCases.submittedAt,
                version: moderationCases.version,
              })
              .from(moderationCases)
              .where(eq(moderationCases.accountId, account.id))
              .limit(1),
            account.role === "INFLUENCER"
              ? loadInfluencerProfile(transaction, account.id)
              : account.role === "COMPANY"
                ? loadCompanyProfile(transaction, account.id)
                : Promise.resolve(null),
          ]);

          const moderationCase = moderationCaseRows[0];
          const historyRows = moderationCase
            ? await transaction
                .select({
                  action: moderationEvents.action,
                  actorAccountId: moderationEvents.actorAccountId,
                  fromStatus: moderationEvents.fromStatus,
                  id: moderationEvents.id,
                  occurredAt: moderationEvents.occurredAt,
                  reason: moderationEvents.reason,
                  submissionSequence: moderationEvents.submissionSequence,
                  toStatus: moderationEvents.toStatus,
                })
                .from(moderationEvents)
                .where(eq(moderationEvents.moderationCaseId, moderationCase.id))
                .orderBy(
                  asc(moderationEvents.occurredAt),
                  asc(moderationEvents.id),
                )
            : [];

          return {
            account: {
              approvedAt: toIso(account.approvedAt),
              archivedAt: toIso(account.archivedAt),
              bannedAt: toIso(account.bannedAt),
              completion: {
                percentage: account.completionPercentage,
                version: account.completionVersion,
              },
              createdAt: account.createdAt.toISOString(),
              id: account.id,
              operationalEmail: account.operationalEmail,
              role: account.role,
              status: account.status,
              submittedAt: toIso(account.submittedAt),
              suspendedAt: toIso(account.suspendedAt),
              updatedAt: account.updatedAt.toISOString(),
              version: account.version,
            },
            consents: consentRows.map((consent) => ({
              acceptedAt: consent.acceptedAt.toISOString(),
              contentHash: consent.contentHash,
              documentType: consent.documentType,
              isCurrent:
                consent.retiredAt === null &&
                consent.activeFrom.getTime() <= Date.now(),
              versionLabel: consent.versionLabel,
            })),
            contactPreferences: contactPreferenceRows[0] ?? null,
            media: mediaRows.map((media) => ({
              ...media,
              archivedAt: toIso(media.archivedAt),
              createdAt: media.createdAt.toISOString(),
              kind: media.kind as "AVATAR" | "COVER" | "LOGO",
              updatedAt: media.updatedAt.toISOString(),
            })),
            moderation: moderationCase
              ? {
                  assignedAdminAccountId: moderationCase.assignedAdminAccountId,
                  caseVersion: moderationCase.version,
                  currentSubmissionSequence:
                    moderationCase.currentSubmissionSequence,
                  history: historyRows.map((event) => ({
                    ...event,
                    occurredAt: event.occurredAt.toISOString(),
                  })),
                  resolvedAt: toIso(moderationCase.resolvedAt),
                  submittedAt: toIso(moderationCase.submittedAt),
                }
              : null,
            profile,
            socialProfiles: socialRows.map((social) => ({
              handle: social.handle,
              platform: social.platform,
              url: social.normalizedUrl,
              version: social.version,
            })),
          } satisfies BackofficeAccountDetailDto;
        },
      );
    },
  };
}
