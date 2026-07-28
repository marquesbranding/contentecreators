import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

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
  createServerVerifiedAccountTransactionRunner,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { BackofficeSubmissionReviewDto } from "../../types/submission-review.types";
import type { SubmissionReviewRepository } from "./submission-review.service";

export type SubmissionReviewAccessErrorCode = "ADMIN_REQUIRED";

export class SubmissionReviewAccessError extends Error {
  constructor(readonly code: SubmissionReviewAccessErrorCode) {
    super(code);
    this.name = "SubmissionReviewAccessError";
  }
}

const CNPJ_ASSISTANCE_DISCLAIMER =
  "Os dados do CNPJ podem ter sido digitados manualmente ou sugeridos pela BrasilAPI e editados. Esta assistência não verifica legitimidade, não é antifraude e não substitui a análise manual.";

function toIso(value: Date | null) {
  return value?.toISOString() ?? null;
}

function assertCurrentAdmin(actor: { role: string; status: string }) {
  if (actor.role !== "ADMIN" || actor.status !== "APPROVED") {
    throw new SubmissionReviewAccessError("ADMIN_REQUIRED");
  }
}

export function createDrizzleSubmissionReviewRepository({
  runVerifiedTransaction,
}: {
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}): SubmissionReviewRepository {
  return {
    findByAccountId(query) {
      return runVerifiedTransaction(
        { requestId: query.requestId },
        async (transaction, actor) => {
          assertCurrentAdmin(actor);

          const [account] = await transaction
            .select({
              archivedAt: accounts.archivedAt,
              completionPercentage: accounts.completionPercentage,
              completionVersion: accounts.completionVersion,
              id: accounts.id,
              operationalEmail: accounts.operationalEmail,
              role: accounts.role,
              status: accounts.status,
              submittedAt: accounts.submittedAt,
              version: accounts.version,
            })
            .from(accounts)
            .where(eq(accounts.id, query.accountId))
            .limit(1);

          if (
            !account ||
            (account.role !== "INFLUENCER" && account.role !== "COMPANY")
          ) {
            return null;
          }

          const [moderationCase] = await transaction
            .select({
              currentSubmissionSequence:
                moderationCases.currentSubmissionSequence,
              id: moderationCases.id,
              version: moderationCases.version,
            })
            .from(moderationCases)
            .where(eq(moderationCases.accountId, account.id))
            .limit(1);

          if (!moderationCase) {
            return null;
          }

          const consentRows = await transaction
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
            );

          const [contactPreferences] = await transaction
            .select({
              archivedAt: accountContactPreferences.archivedAt,
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
            .limit(1);

          const mediaRows = await transaction
            .select({
              height: mediaAssets.height,
              id: mediaAssets.id,
              kind: mediaAssets.kind,
              mimeType: mediaAssets.mimeType,
              status: mediaAssets.status,
              version: mediaAssets.version,
              width: mediaAssets.width,
            })
            .from(mediaAssets)
            .where(
              and(
                eq(mediaAssets.ownerAccountId, account.id),
                isNull(mediaAssets.archivedAt),
              ),
            )
            .orderBy(asc(mediaAssets.kind), desc(mediaAssets.updatedAt));

          const socialRows = await transaction
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
            .orderBy(asc(socialProfiles.sortOrder), asc(socialProfiles.id));

          const historyRows = await transaction
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
            );

          const common = {
            account: {
              archivedAt: toIso(account.archivedAt),
              completion: {
                percentage: account.completionPercentage,
                version: account.completionVersion,
              },
              id: account.id,
              operationalEmail: account.operationalEmail,
              role: account.role,
              status: account.status,
              submittedAt: toIso(account.submittedAt),
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
            contactPreferences:
              contactPreferences && contactPreferences.archivedAt === null
                ? {
                    emailVisibleToApprovedCompanies:
                      contactPreferences.emailVisibleToApprovedCompanies,
                    socialVisibleToApprovedCompanies:
                      contactPreferences.socialVisibleToApprovedCompanies,
                    version: contactPreferences.version,
                    whatsappVisibleToApprovedCompanies:
                      contactPreferences.whatsappVisibleToApprovedCompanies,
                  }
                : null,
            media: mediaRows,
            moderation: {
              caseVersion: moderationCase.version,
              currentSubmissionSequence:
                moderationCase.currentSubmissionSequence,
              history: historyRows.map((event) => ({
                ...event,
                occurredAt: event.occurredAt.toISOString(),
              })),
            },
            socialProfiles: socialRows.map((social) => ({
              handle: social.handle,
              platform: social.platform,
              url: social.normalizedUrl,
              version: social.version,
            })),
          };

          if (account.role === "INFLUENCER") {
            const [profile] = await transaction
              .select({
                avatarAssetId: creatorProfiles.avatarAssetId,
                bio: creatorProfiles.bio,
                city: creatorProfiles.city,
                coverAssetId: creatorProfiles.coverAssetId,
                creatorType: creatorProfiles.creatorType,
                displayName: creatorProfiles.displayName,
                legalName: creatorProfiles.legalName,
                state: creatorProfiles.state,
                version: creatorProfiles.version,
                whatsappE164: creatorProfiles.whatsappE164,
              })
              .from(creatorProfiles)
              .where(eq(creatorProfiles.accountId, account.id))
              .limit(1);

            if (!profile) {
              return null;
            }

            const nicheRows = await transaction
              .select({
                name: niches.name,
                slug: niches.slug,
              })
              .from(creatorNiches)
              .innerJoin(niches, eq(creatorNiches.nicheId, niches.id))
              .innerJoin(
                creatorProfiles,
                eq(creatorNiches.creatorProfileId, creatorProfiles.id),
              )
              .where(eq(creatorProfiles.accountId, account.id))
              .orderBy(asc(niches.sortOrder), asc(niches.name));

            const metricRows = await transaction
              .select({
                engagementRate: creatorMetricSnapshots.engagementRate,
                followerCount: creatorMetricSnapshots.followerCount,
                observedOn: creatorMetricSnapshots.observedOn,
                platform: creatorMetricSnapshots.platform,
              })
              .from(creatorMetricSnapshots)
              .innerJoin(
                creatorProfiles,
                eq(creatorMetricSnapshots.creatorProfileId, creatorProfiles.id),
              )
              .where(eq(creatorProfiles.accountId, account.id))
              .orderBy(
                desc(creatorMetricSnapshots.observedOn),
                desc(creatorMetricSnapshots.createdAt),
              )
              .limit(100);

            return {
              ...common,
              account: {
                ...common.account,
                role: "INFLUENCER",
              },
              media: common.media.filter(
                (asset) =>
                  asset.id === profile.avatarAssetId ||
                  asset.id === profile.coverAssetId,
              ),
              profile: {
                bio: profile.bio,
                city: profile.city,
                creatorType: profile.creatorType,
                displayName: profile.displayName,
                legalName: profile.legalName,
                niches: nicheRows,
                selfReportedMetrics: metricRows.map((metric) => ({
                  ...metric,
                  observedOn: metric.observedOn.toISOString().slice(0, 10),
                })),
                state: profile.state,
                version: profile.version,
                whatsappE164: profile.whatsappE164,
              },
              role: "INFLUENCER",
            } satisfies BackofficeSubmissionReviewDto;
          }

          const [profile] = await transaction
            .select({
              cnpj: companyProfiles.cnpj,
              description: companyProfiles.description,
              employeeRange: companyProfiles.employeeRange,
              id: companyProfiles.id,
              legalName: companyProfiles.legalName,
              logoAssetId: companyProfiles.logoAssetId,
              coverAssetId: companyProfiles.coverAssetId,
              segment: companyProfiles.segment,
              tradeName: companyProfiles.tradeName,
              version: companyProfiles.version,
              websiteUrl: companyProfiles.websiteUrl,
              whatsappE164: companyProfiles.whatsappE164,
            })
            .from(companyProfiles)
            .where(eq(companyProfiles.accountId, account.id))
            .limit(1);

          if (!profile) {
            return null;
          }

          const locationRows = await transaction
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
            .orderBy(
              desc(companyLocations.isPrimary),
              asc(companyLocations.id),
            );

          return {
            ...common,
            account: {
              ...common.account,
              role: "COMPANY",
            },
            cnpjAssistance: {
              disclaimer: CNPJ_ASSISTANCE_DISCLAIMER,
              source: "USER_PROVIDED_EDITABLE_DATA",
            },
            media: common.media.filter(
              (asset) =>
                asset.id === profile.logoAssetId ||
                asset.id === profile.coverAssetId,
            ),
            profile: {
              cnpj: profile.cnpj,
              description: profile.description,
              employeeRange: profile.employeeRange,
              legalName: profile.legalName,
              locations: locationRows,
              segment: profile.segment,
              tradeName: profile.tradeName,
              version: profile.version,
              websiteUrl: profile.websiteUrl,
              whatsappE164: profile.whatsappE164,
            },
            role: "COMPANY",
          } satisfies BackofficeSubmissionReviewDto;
        },
      );
    },
  };
}

export async function createServerSubmissionReviewRepository() {
  return createDrizzleSubmissionReviewRepository({
    runVerifiedTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
