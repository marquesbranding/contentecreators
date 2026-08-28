import "server-only";

import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import {
  getDatabaseClient,
  type ApplicationDatabase,
  type ApplicationTransaction,
} from "@/db/client";
import {
  accountConsents,
  accountContactPreferences,
  accounts,
  companyLocations,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  emailOutbox,
  legalDocuments,
  mediaAssets,
  moderationCases,
  moderationEvents,
  socialProfiles,
} from "@/db/schema";
import {
  createAuditedTransactionRunner,
  withAuditedTransaction,
} from "@/features/audit/server";
import type { VerifiedAuditContext } from "@/features/audit/server";

import type {
  EmailRegistrationInput,
  GoogleProfileInput,
} from "../../schemas/onboarding-form-schema";
import { calculateProfileCompletionForAccount } from "./drizzle-profile-completion.repository";
import { createDrizzleCompanyProfileRepository } from "./drizzle-company-profile.repository";
import { createDrizzleInfluencerProfileRepository } from "./drizzle-influencer-profile.repository";
import { resolveCreatorNiches } from "./creator-niche.repository";
import type { OnboardingRegistrationRepository } from "../services/onboarding-registration.service";

type ProfileInput = EmailRegistrationInput | GoogleProfileInput;
type CreatorProfileInput = Extract<ProfileInput, { role: "INFLUENCER" }>;
type CompanyProfileInput = Extract<ProfileInput, { role: "COMPANY" }>;

interface RequestedProfileMedia {
  id: string;
  kind: "AVATAR" | "COVER" | "LOGO";
}

function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/gu, "");
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

function auditContext(
  requestId: string,
  reason: string,
  account?: { id: string; role: "INFLUENCER" | "COMPANY" },
): VerifiedAuditContext {
  if (account) {
    return {
      actorAccountId: account.id,
      actorRole: account.role,
      actorType: "USER",
      reason,
      requestId,
      source: "APPLICATION",
    };
  }

  return {
    actorAccountId: null,
    actorRole: null,
    actorType: "SYSTEM",
    reason,
    requestId,
    source: "AUTH_HOOK",
  };
}

function requestedCreatorMedia(input: CreatorProfileInput) {
  return [
    input.avatarAssetId
      ? { id: input.avatarAssetId, kind: "AVATAR" as const }
      : null,
    input.coverAssetId
      ? { id: input.coverAssetId, kind: "COVER" as const }
      : null,
  ].filter((media) => media !== null);
}

function requestedCompanyMedia(input: CompanyProfileInput) {
  return [
    input.logoAssetId ? { id: input.logoAssetId, kind: "LOGO" as const } : null,
    input.coverAssetId
      ? { id: input.coverAssetId, kind: "COVER" as const }
      : null,
  ].filter((media) => media !== null);
}

async function lockInitialProfileMedia(
  transaction: ApplicationTransaction,
  accountId: string,
  requestedMedia: RequestedProfileMedia[],
) {
  if (requestedMedia.length === 0) {
    return;
  }

  const distinctIds = new Set(requestedMedia.map((media) => media.id));
  if (distinctIds.size !== requestedMedia.length) {
    throw new Error("Profile media purposes must use distinct assets.");
  }

  const mediaRows = await transaction
    .select({
      archivedAt: mediaAssets.archivedAt,
      id: mediaAssets.id,
      kind: mediaAssets.kind,
      ownerAccountId: mediaAssets.ownerAccountId,
      status: mediaAssets.status,
    })
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, [...distinctIds]))
    .for("update");

  const validMedia = requestedMedia.every((requested) => {
    const media = mediaRows.find((row) => row.id === requested.id);

    return (
      media?.ownerAccountId === accountId &&
      media.kind === requested.kind &&
      media.status === "PENDING" &&
      !media.archivedAt
    );
  });

  if (!validMedia || mediaRows.length !== requestedMedia.length) {
    throw new Error("Profile media is unavailable for initial activation.");
  }
}

async function activateInitialProfileMedia(
  transaction: ApplicationTransaction,
  accountId: string,
  requestedMedia: RequestedProfileMedia[],
) {
  if (requestedMedia.length === 0) {
    return;
  }

  const activated = await transaction
    .update(mediaAssets)
    .set({
      status: "ACTIVE",
      updatedAt: new Date(),
      version: sql`${mediaAssets.version} + 1`,
    })
    .where(
      and(
        inArray(
          mediaAssets.id,
          requestedMedia.map((media) => media.id),
        ),
        eq(mediaAssets.ownerAccountId, accountId),
        eq(mediaAssets.status, "PENDING"),
        isNull(mediaAssets.archivedAt),
      ),
    )
    .returning({ id: mediaAssets.id });

  if (activated.length !== requestedMedia.length) {
    throw new Error("Profile media activation did not converge.");
  }
}

async function insertRoleProfile(
  transaction: ApplicationTransaction,
  accountId: string,
  input: ProfileInput,
) {
  if (input.role === "COMPANY") {
    const requestedMedia = requestedCompanyMedia(input);
    await lockInitialProfileMedia(transaction, accountId, requestedMedia);

    const [profile] = await transaction
      .insert(companyProfiles)
      .values({
        accountId,
        cnpj: input.cnpj,
        description: input.description,
        employeeRange: input.employeeRange,
        legalName: input.legalName,
        logoAssetId: input.logoAssetId,
        coverAssetId: input.coverAssetId,
        segment: input.segment,
        tradeName: input.tradeName,
        websiteUrl: input.websiteUrl,
        whatsappE164: normalizeWhatsapp(input.whatsapp),
      })
      .returning({ id: companyProfiles.id });

    if (!profile) {
      throw new Error("Company profile was not created.");
    }

    await activateInitialProfileMedia(transaction, accountId, requestedMedia);

    await transaction.insert(companyLocations).values([
      {
        city: input.city,
        companyProfileId: profile.id,
        complement: input.complement || null,
        isPrimary: true,
        label: "Sede",
        neighborhood: input.neighborhood,
        number: input.number,
        postalCode: input.postalCode,
        state: input.state,
        street: input.street,
      },
      ...input.additionalLocations.map((location) => ({
        city: location.city,
        companyProfileId: profile.id,
        complement: location.complement || null,
        isPrimary: false,
        label: location.label,
        neighborhood: location.neighborhood,
        number: location.number,
        postalCode: location.postalCode,
        state: location.state,
        street: location.street,
      })),
    ]);

    if (input.socialPlatform && input.socialUrl) {
      await transaction.insert(socialProfiles).values({
        normalizedUrl: input.socialUrl,
        ownerAccountId: accountId,
        platform: input.socialPlatform,
      });
    }

    return;
  }

  const requestedMedia = requestedCreatorMedia(input);
  await lockInitialProfileMedia(transaction, accountId, requestedMedia);

  const [profile] = await transaction
    .insert(creatorProfiles)
    .values({
      accountId,
      avatarAssetId: input.avatarAssetId,
      bio: input.bio,
      city: input.city,
      coverAssetId: input.coverAssetId,
      creatorType: input.creatorType,
      displayName: input.displayName || input.legalName,
      legalName: input.legalName,
      state: input.state,
      whatsappE164: normalizeWhatsapp(input.whatsapp),
    })
    .returning({ id: creatorProfiles.id });

  if (!profile) {
    throw new Error("Creator profile was not created.");
  }

  await activateInitialProfileMedia(transaction, accountId, requestedMedia);

  const insertedSocialProfiles = await transaction
    .insert(socialProfiles)
    .values(
      input.socialChannels.map((channel) => ({
        isPrimary: channel.isPrimary,
        normalizedUrl: channel.url,
        ownerAccountId: accountId,
        platform: channel.platform,
      })),
    )
    .returning({ id: socialProfiles.id, platform: socialProfiles.platform });
  const channelByPlatform = new Map(
    input.socialChannels.map((channel) => [channel.platform, channel]),
  );

  const observedOn = new Date();
  await transaction.insert(creatorMetricSnapshots).values(
    insertedSocialProfiles.map((socialProfile) => {
      const channel = channelByPlatform.get(
        socialProfile.platform as (typeof input.socialChannels)[number]["platform"],
      );
      const isInstagram = socialProfile.platform === "INSTAGRAM";

      return {
        creatorProfileId: profile.id,
        followerCount: channel?.followerCount ?? 0,
        interactionCount: isInstagram ? channel?.interactions : undefined,
        newFollowerCount: isInstagram ? channel?.newFollowers : undefined,
        observedOn,
        platform: socialProfile.platform,
        sharedContentDescription: isInstagram
          ? channel?.sharedContent
          : undefined,
        socialProfileId: socialProfile.id,
        viewCount: isInstagram ? channel?.views : undefined,
      };
    }),
  );

  const selectedNiches = await resolveCreatorNiches(
    transaction,
    input.nicheSlugs,
    input.otherNiche,
  );

  await transaction.insert(creatorNiches).values(
    selectedNiches.map((niche) => ({
      creatorProfileId: profile.id,
      nicheId: niche.id,
    })),
  );

  const [contactDocument] = await transaction
    .select({ id: legalDocuments.id })
    .from(legalDocuments)
    .where(
      and(
        eq(legalDocuments.documentType, "CONTACT_VISIBILITY"),
        isNull(legalDocuments.retiredAt),
        lte(legalDocuments.activeFrom, new Date()),
      ),
    )
    .orderBy(desc(legalDocuments.activeFrom), desc(legalDocuments.publishedAt))
    .limit(1);

  if (!contactDocument) {
    throw new Error("Active contact visibility document is not configured.");
  }

  await transaction.insert(accountContactPreferences).values({
    accountId,
    consentDocumentId: contactDocument.id,
    emailVisibleToApprovedCompanies: input.contactVisibilityAccepted,
    socialVisibleToApprovedCompanies: input.contactVisibilityAccepted,
    whatsappVisibleToApprovedCompanies: input.contactVisibilityAccepted,
  });
}

async function hasPreparedProfile(
  transaction: ApplicationTransaction,
  account: { id: string; role: "INFLUENCER" | "COMPANY" },
) {
  if (account.role === "COMPANY") {
    const [profile] = await transaction
      .select({ id: companyProfiles.id })
      .from(companyProfiles)
      .where(eq(companyProfiles.accountId, account.id))
      .limit(1);
    return Boolean(profile);
  }

  const [profile] = await transaction
    .select({ id: creatorProfiles.id })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.accountId, account.id))
    .limit(1);
  return Boolean(profile);
}

async function updatePreparedRoleProfile(
  transaction: ApplicationTransaction,
  account: { id: string; role: "INFLUENCER" | "COMPANY" },
  input: GoogleProfileInput,
  requestId: string,
) {
  if (input.role === "COMPANY" && account.role === "COMPANY") {
    const repository = createDrizzleCompanyProfileRepository();
    const current = await repository.loadApprovedProfile(
      transaction,
      account.id,
    );
    if (!current) {
      throw new Error("Prepared company profile was not found.");
    }

    const requestedMedia = requestedCompanyMedia(input).filter(
      (media) =>
        media.id !== current.logoAssetId && media.id !== current.coverAssetId,
    );
    await lockInitialProfileMedia(transaction, account.id, requestedMedia);
    const result = await repository.updateApprovedProfile(
      transaction,
      account.id,
      { ...input, expectedVersion: current.version },
      requestId,
      "Review prepared company profile before moderation",
      auditContext(requestId, "Review prepared company profile", account),
      false,
    );
    if (result.kind !== "updated") {
      throw new Error("Prepared company profile changed during review.");
    }

    await transaction
      .update(companyProfiles)
      .set({
        coverAssetId: input.coverAssetId ?? result.profile.coverAssetId,
        logoAssetId: input.logoAssetId ?? result.profile.logoAssetId,
      })
      .where(eq(companyProfiles.accountId, account.id));
    await activateInitialProfileMedia(transaction, account.id, requestedMedia);
    return;
  }

  if (input.role === "INFLUENCER" && account.role === "INFLUENCER") {
    const repository = createDrizzleInfluencerProfileRepository();
    const current = await repository.loadApprovedProfile(
      transaction,
      account.id,
    );
    if (!current) {
      throw new Error("Prepared creator profile was not found.");
    }

    const requestedMedia = requestedCreatorMedia(input).filter(
      (media) =>
        media.id !== current.avatarAssetId && media.id !== current.coverAssetId,
    );
    await lockInitialProfileMedia(transaction, account.id, requestedMedia);
    const result = await repository.updateApprovedProfile(
      transaction,
      account.id,
      { ...input, expectedVersion: current.version },
      requestId,
      "Review prepared creator profile before moderation",
      auditContext(requestId, "Review prepared creator profile", account),
      false,
    );
    if (result.kind !== "updated") {
      throw new Error("Prepared creator profile changed during review.");
    }

    await transaction
      .update(creatorProfiles)
      .set({
        avatarAssetId: input.avatarAssetId ?? result.profile.avatarAssetId,
        coverAssetId: input.coverAssetId ?? result.profile.coverAssetId,
      })
      .where(eq(creatorProfiles.accountId, account.id));
    await transaction
      .update(accountContactPreferences)
      .set({
        emailVisibleToApprovedCompanies: input.contactVisibilityAccepted,
        socialVisibleToApprovedCompanies: input.contactVisibilityAccepted,
        whatsappVisibleToApprovedCompanies: input.contactVisibilityAccepted,
      })
      .where(
        and(
          eq(accountContactPreferences.accountId, account.id),
          isNull(accountContactPreferences.archivedAt),
        ),
      );
    await activateInitialProfileMedia(transaction, account.id, requestedMedia);
    return;
  }

  throw new Error("Prepared profile role does not match the account.");
}

async function submitPreparedAccount(
  transaction: ApplicationTransaction,
  account: {
    id: string;
    operationalEmail: string;
    role: "INFLUENCER" | "COMPANY";
    status: string;
  },
  requestId: string,
) {
  if (account.status === "PENDING_REVIEW") {
    return { kind: "already_submitted" as const };
  }

  if (
    account.status !== "ONBOARDING" ||
    !(await hasPreparedProfile(transaction, account))
  ) {
    return { kind: "not_prepared" as const };
  }

  const now = new Date();
  const documents = await transaction
    .select()
    .from(legalDocuments)
    .where(
      and(
        inArray(legalDocuments.documentType, [
          "TERMS",
          "PRIVACY",
          "CONTACT_VISIBILITY",
        ]),
        isNull(legalDocuments.retiredAt),
        lte(legalDocuments.activeFrom, now),
      ),
    )
    .orderBy(desc(legalDocuments.activeFrom), desc(legalDocuments.publishedAt));
  const termsDocument = documents.find(
    (document) => document.documentType === "TERMS",
  );
  const privacyDocument = documents.find(
    (document) => document.documentType === "PRIVACY",
  );

  if (!termsDocument || !privacyDocument) {
    throw new Error("Active legal documents are not configured.");
  }
  const requiredDocuments = [termsDocument, privacyDocument];

  await transaction.insert(accountConsents).values(
    requiredDocuments.map((document) => ({
      accountId: account.id,
      context: { flow: "onboarding", legalCopyApproved: false },
      legalDocumentId: document.id,
      requestId,
    })),
  );

  const contactDocument = documents.find(
    (document) => document.documentType === "CONTACT_VISIBILITY",
  );
  if (account.role === "INFLUENCER") {
    if (!contactDocument) {
      throw new Error("Active contact visibility document is not configured.");
    }

    const [storedPreference] = await transaction
      .select()
      .from(accountContactPreferences)
      .where(
        and(
          eq(accountContactPreferences.accountId, account.id),
          isNull(accountContactPreferences.archivedAt),
        ),
      )
      .limit(1);
    const preference =
      storedPreference ??
      (
        await transaction
          .insert(accountContactPreferences)
          .values({
            accountId: account.id,
            consentDocumentId: contactDocument.id,
            emailVisibleToApprovedCompanies: false,
            socialVisibleToApprovedCompanies: false,
            whatsappVisibleToApprovedCompanies: false,
          })
          .returning()
      )[0];

    if (
      preference &&
      (preference.emailVisibleToApprovedCompanies ||
        preference.socialVisibleToApprovedCompanies ||
        preference.whatsappVisibleToApprovedCompanies)
    ) {
      await transaction.insert(accountConsents).values({
        accountId: account.id,
        context: {
          emailVisibleToApprovedCompanies:
            preference.emailVisibleToApprovedCompanies,
          flow: "onboarding",
          legalCopyApproved: false,
          socialVisibleToApprovedCompanies:
            preference.socialVisibleToApprovedCompanies,
          whatsappVisibleToApprovedCompanies:
            preference.whatsappVisibleToApprovedCompanies,
        },
        legalDocumentId: preference.consentDocumentId,
        requestId,
      });
    }
  }

  const [moderationCase] = await transaction
    .insert(moderationCases)
    .values({
      accountId: account.id,
      currentSubmissionSequence: 1,
      submittedAt: now,
    })
    .returning({ id: moderationCases.id });

  if (!moderationCase) {
    throw new Error("Moderation case was not created.");
  }

  await transaction.insert(moderationEvents).values({
    actorAccountId: account.id,
    action: "SUBMIT",
    fromStatus: "ONBOARDING",
    idempotencyKey: `onboarding:${account.id}:1`,
    moderationCaseId: moderationCase.id,
    submissionSequence: 1,
    toStatus: "PENDING_REVIEW",
  });
  const completion = await calculateProfileCompletionForAccount(
    transaction,
    account.id,
    account.role,
  );

  await transaction
    .update(accounts)
    .set({
      completionPercentage: completion.percentage,
      completionVersion: completion.version,
      status: "PENDING_REVIEW",
      submittedAt: now,
      updatedAt: now,
      version: sql`${accounts.version} + 1`,
    })
    .where(eq(accounts.id, account.id));

  const [outboxItem] = await transaction
    .insert(emailOutbox)
    .values({
      accountId: account.id,
      idempotencyKey: `onboarding-received:${account.id}:1`,
      payload: { role: account.role },
      recipientEmail: account.operationalEmail,
      template: "ONBOARDING_RECEIVED",
    })
    .returning({ id: emailOutbox.id });

  if (!outboxItem) {
    throw new Error("Onboarding email outbox item was not created.");
  }

  return {
    kind: "submitted" as const,
    outboxId: outboxItem.id,
  };
}

interface Dependencies {
  database?: ApplicationDatabase;
  runAuditedTransaction?: ReturnType<typeof createAuditedTransactionRunner>;
}

export function createDrizzleOnboardingRegistrationRepository(
  dependencies: Dependencies = {},
): OnboardingRegistrationRepository {
  const database = dependencies.database ?? getDatabaseClient().database;
  const runAuditedTransaction =
    dependencies.runAuditedTransaction ??
    (<T>(
      context: VerifiedAuditContext,
      work: (transaction: ApplicationTransaction) => Promise<T>,
    ) => withAuditedTransaction(context, work));

  return {
    async prepareEmailRegistration({ identityId, input, requestId }) {
      return runAuditedTransaction(
        auditContext(requestId, "Prepare combined email registration"),
        async (transaction) => {
          const [account] = await transaction
            .insert(accounts)
            .values({
              authUserId: identityId,
              operationalEmail: input.email,
              role: input.role,
            })
            .returning({ id: accounts.id });

          if (!account) {
            throw new Error("Application account was not created.");
          }

          await insertRoleProfile(transaction, account.id, input);
          return { accountId: account.id };
        },
      );
    },

    async submitGoogleProfile({ email, identityId, input, requestId }) {
      const [actorAccount] = await database
        .select({
          id: accounts.id,
          role: accounts.role,
          status: accounts.status,
        })
        .from(accounts)
        .where(eq(accounts.authUserId, identityId))
        .limit(1);

      if (
        !actorAccount ||
        actorAccount.role !== input.role ||
        actorAccount.status !== "ONBOARDING"
      ) {
        throw new Error("Account cannot submit this profile.");
      }

      return runAuditedTransaction(
        auditContext(requestId, "Submit Google first-access profile", {
          id: actorAccount.id,
          role: input.role,
        }),
        async (transaction) => {
          const [account] = await transaction
            .select()
            .from(accounts)
            .where(eq(accounts.authUserId, identityId))
            .limit(1);

          if (
            !account ||
            account.role !== input.role ||
            account.status !== "ONBOARDING"
          ) {
            throw new Error("Account cannot submit this profile.");
          }

          if (
            await hasPreparedProfile(transaction, {
              id: account.id,
              role: input.role,
            })
          ) {
            await updatePreparedRoleProfile(
              transaction,
              { id: account.id, role: input.role },
              input,
              requestId,
            );
          } else {
            await insertRoleProfile(transaction, account.id, input);
          }
          const result = await submitPreparedAccount(
            transaction,
            {
              id: account.id,
              operationalEmail: email,
              role: input.role,
              status: account.status,
            },
            requestId,
          );

          if (result.kind !== "submitted") {
            throw new Error("Profile submission did not converge.");
          }

          return result;
        },
      );
    },

    async finalizePreparedRegistration(identityId) {
      const requestId = crypto.randomUUID();
      return runAuditedTransaction(
        auditContext(requestId, "Finalize verified email registration"),
        async (transaction) => {
          const [account] = await transaction
            .select()
            .from(accounts)
            .where(eq(accounts.authUserId, identityId))
            .limit(1);

          if (
            !account?.role ||
            !["INFLUENCER", "COMPANY"].includes(account.role)
          ) {
            return { kind: "not_prepared" as const };
          }

          return submitPreparedAccount(
            transaction,
            {
              id: account.id,
              operationalEmail: account.operationalEmail,
              role: account.role as "INFLUENCER" | "COMPANY",
              status: account.status,
            },
            requestId,
          );
        },
      );
    },
  };
}
