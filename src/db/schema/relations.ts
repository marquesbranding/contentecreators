import { relations } from "drizzle-orm";

import { accounts } from "./accounts";
import {
  accountConsents,
  accountContactPreferences,
  auditRevisions,
  blockedIdentities,
  legalDocuments,
} from "./compliance";
import { emailAttempts, emailOutbox } from "./communications";
import { mediaAssets } from "./media";
import { moderationCases, moderationEvents } from "./moderation";
import {
  companyLocations,
  companyProfiles,
  creatorMetricSnapshots,
  creatorNiches,
  creatorProfiles,
  niches,
  onboardingDrafts,
  socialProfiles,
} from "./profiles";
import { sponsorshipPlacements } from "./sponsorships";

export const accountsRelations = relations(accounts, ({ many, one }) => ({
  creatorProfile: one(creatorProfiles, {
    fields: [accounts.id],
    references: [creatorProfiles.accountId],
  }),
  companyProfile: one(companyProfiles, {
    fields: [accounts.id],
    references: [companyProfiles.accountId],
  }),
  onboardingDraft: one(onboardingDrafts, {
    fields: [accounts.id],
    references: [onboardingDrafts.accountId],
  }),
  mediaAssets: many(mediaAssets),
  socialProfiles: many(socialProfiles),
  moderationCase: one(moderationCases, {
    fields: [accounts.id],
    references: [moderationCases.accountId],
    relationName: "moderatedAccount",
  }),
  assignedModerationCases: many(moderationCases, {
    relationName: "assignedAdmin",
  }),
  moderationEvents: many(moderationEvents),
  emailOutboxItems: many(emailOutbox),
  consents: many(accountConsents),
  contactPreferences: many(accountContactPreferences),
  auditRevisions: many(auditRevisions),
  sponsorshipPlacements: many(sponsorshipPlacements),
}));

export const onboardingDraftsRelations = relations(
  onboardingDrafts,
  ({ one }) => ({
    account: one(accounts, {
      fields: [onboardingDrafts.accountId],
      references: [accounts.id],
    }),
  }),
);

export const mediaAssetsRelations = relations(mediaAssets, ({ many, one }) => ({
  ownerAccount: one(accounts, {
    fields: [mediaAssets.ownerAccountId],
    references: [accounts.id],
  }),
  replacement: one(mediaAssets, {
    fields: [mediaAssets.replacedByAssetId],
    references: [mediaAssets.id],
    relationName: "mediaReplacement",
  }),
  predecessors: many(mediaAssets, { relationName: "mediaReplacement" }),
}));

export const creatorProfilesRelations = relations(
  creatorProfiles,
  ({ many, one }) => ({
    account: one(accounts, {
      fields: [creatorProfiles.accountId],
      references: [accounts.id],
    }),
    avatar: one(mediaAssets, {
      fields: [creatorProfiles.avatarAssetId],
      references: [mediaAssets.id],
      relationName: "creatorAvatar",
    }),
    cover: one(mediaAssets, {
      fields: [creatorProfiles.coverAssetId],
      references: [mediaAssets.id],
      relationName: "creatorCover",
    }),
    nicheLinks: many(creatorNiches),
    metricSnapshots: many(creatorMetricSnapshots),
    featuredPlacements: many(sponsorshipPlacements),
  }),
);

export const companyProfilesRelations = relations(
  companyProfiles,
  ({ many, one }) => ({
    account: one(accounts, {
      fields: [companyProfiles.accountId],
      references: [accounts.id],
    }),
    logo: one(mediaAssets, {
      fields: [companyProfiles.logoAssetId],
      references: [mediaAssets.id],
      relationName: "companyLogo",
    }),
    cover: one(mediaAssets, {
      fields: [companyProfiles.coverAssetId],
      references: [mediaAssets.id],
      relationName: "companyCover",
    }),
    locations: many(companyLocations),
  }),
);

export const companyLocationsRelations = relations(
  companyLocations,
  ({ one }) => ({
    companyProfile: one(companyProfiles, {
      fields: [companyLocations.companyProfileId],
      references: [companyProfiles.id],
    }),
  }),
);

export const nichesRelations = relations(niches, ({ many }) => ({
  creatorLinks: many(creatorNiches),
}));

export const creatorNichesRelations = relations(creatorNiches, ({ one }) => ({
  creatorProfile: one(creatorProfiles, {
    fields: [creatorNiches.creatorProfileId],
    references: [creatorProfiles.id],
  }),
  niche: one(niches, {
    fields: [creatorNiches.nicheId],
    references: [niches.id],
  }),
}));

export const socialProfilesRelations = relations(
  socialProfiles,
  ({ many, one }) => ({
    ownerAccount: one(accounts, {
      fields: [socialProfiles.ownerAccountId],
      references: [accounts.id],
    }),
    metricSnapshots: many(creatorMetricSnapshots),
  }),
);

export const creatorMetricSnapshotsRelations = relations(
  creatorMetricSnapshots,
  ({ one }) => ({
    creatorProfile: one(creatorProfiles, {
      fields: [creatorMetricSnapshots.creatorProfileId],
      references: [creatorProfiles.id],
    }),
    socialProfile: one(socialProfiles, {
      fields: [creatorMetricSnapshots.socialProfileId],
      references: [socialProfiles.id],
    }),
  }),
);

export const moderationCasesRelations = relations(
  moderationCases,
  ({ many, one }) => ({
    account: one(accounts, {
      fields: [moderationCases.accountId],
      references: [accounts.id],
      relationName: "moderatedAccount",
    }),
    assignedAdmin: one(accounts, {
      fields: [moderationCases.assignedAdminAccountId],
      references: [accounts.id],
      relationName: "assignedAdmin",
    }),
    events: many(moderationEvents),
  }),
);

export const moderationEventsRelations = relations(
  moderationEvents,
  ({ one }) => ({
    moderationCase: one(moderationCases, {
      fields: [moderationEvents.moderationCaseId],
      references: [moderationCases.id],
    }),
    actorAccount: one(accounts, {
      fields: [moderationEvents.actorAccountId],
      references: [accounts.id],
    }),
  }),
);

export const sponsorshipPlacementsRelations = relations(
  sponsorshipPlacements,
  ({ one }) => ({
    advertiserAccount: one(accounts, {
      fields: [sponsorshipPlacements.advertiserAccountId],
      references: [accounts.id],
    }),
    featuredCreatorProfile: one(creatorProfiles, {
      fields: [sponsorshipPlacements.featuredCreatorProfileId],
      references: [creatorProfiles.id],
    }),
    creativeAsset: one(mediaAssets, {
      fields: [sponsorshipPlacements.creativeAssetId],
      references: [mediaAssets.id],
    }),
  }),
);

export const emailOutboxRelations = relations(emailOutbox, ({ many, one }) => ({
  account: one(accounts, {
    fields: [emailOutbox.accountId],
    references: [accounts.id],
  }),
  attempts: many(emailAttempts),
}));

export const emailAttemptsRelations = relations(emailAttempts, ({ one }) => ({
  outboxItem: one(emailOutbox, {
    fields: [emailAttempts.outboxId],
    references: [emailOutbox.id],
  }),
}));

export const legalDocumentsRelations = relations(
  legalDocuments,
  ({ many }) => ({
    accountConsents: many(accountConsents),
    contactPreferences: many(accountContactPreferences),
  }),
);

export const accountConsentsRelations = relations(
  accountConsents,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountConsents.accountId],
      references: [accounts.id],
    }),
    legalDocument: one(legalDocuments, {
      fields: [accountConsents.legalDocumentId],
      references: [legalDocuments.id],
    }),
  }),
);

export const accountContactPreferencesRelations = relations(
  accountContactPreferences,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountContactPreferences.accountId],
      references: [accounts.id],
    }),
    consentDocument: one(legalDocuments, {
      fields: [accountContactPreferences.consentDocumentId],
      references: [legalDocuments.id],
    }),
  }),
);

export const blockedIdentitiesRelations = relations(
  blockedIdentities,
  ({ one }) => ({
    originatingAccount: one(accounts, {
      fields: [blockedIdentities.originatingAccountId],
      references: [accounts.id],
      relationName: "blockedOrigin",
    }),
    blockedByAccount: one(accounts, {
      fields: [blockedIdentities.blockedByAccountId],
      references: [accounts.id],
      relationName: "blockedBy",
    }),
    unblockedByAccount: one(accounts, {
      fields: [blockedIdentities.unblockedByAccountId],
      references: [accounts.id],
      relationName: "unblockedBy",
    }),
  }),
);

export const auditRevisionsRelations = relations(auditRevisions, ({ one }) => ({
  actorAccount: one(accounts, {
    fields: [auditRevisions.actorAccountId],
    references: [accounts.id],
  }),
}));
