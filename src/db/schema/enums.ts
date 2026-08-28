import { pgEnum } from "drizzle-orm/pg-core";

export const accountRoleEnum = pgEnum("account_role", [
  "ADMIN",
  "INFLUENCER",
  "COMPANY",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "ONBOARDING",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SUSPENDED",
  "BANNED",
]);

export const creatorTypeEnum = pgEnum("creator_type", ["INFLUENCER", "UGC"]);

export const socialPlatformEnum = pgEnum("social_platform", [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
  "THREADS",
  "TELEGRAM",
  "OTHER",
]);

export const creatorMetricSourceEnum = pgEnum("creator_metric_source", [
  "SELF_REPORTED",
]);

export const mediaKindEnum = pgEnum("media_kind", [
  "AVATAR",
  "COVER",
  "LOGO",
  "SPONSORSHIP_CREATIVE",
]);

export const mediaStatusEnum = pgEnum("media_status", [
  "PENDING",
  "ACTIVE",
  "ARCHIVED",
  "REJECTED",
]);

export const moderationActionEnum = pgEnum("moderation_action", [
  "SUBMIT",
  "REQUEST_CHANGES",
  "RESUBMIT",
  "APPROVE",
  "SUSPEND",
  "RESTORE",
  "BAN",
  "UNBAN",
  "ARCHIVE",
]);

export const placementTypeEnum = pgEnum("placement_type", [
  "TOP_BANNER",
  "INLINE_BANNER",
  "CAROUSEL",
  "FEATURED_CREATOR",
]);

export const placementAudienceEnum = pgEnum("placement_audience", [
  "ALL",
  "INFLUENCER",
  "COMPANY",
]);

export const emailTemplateEnum = pgEnum("email_template", [
  "ONBOARDING_RECEIVED",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SUSPENDED",
  "RESTORED",
  "BANNED",
]);

export const emailOutboxStatusEnum = pgEnum("email_outbox_status", [
  "PENDING",
  "PROCESSING",
  "SENT",
  "FAILED",
  "DEAD_LETTER",
]);

export const emailAttemptStatusEnum = pgEnum("email_attempt_status", [
  "SENT",
  "FAILED",
]);

export const legalDocumentTypeEnum = pgEnum("legal_document_type", [
  "TERMS",
  "PRIVACY",
  "CONTACT_VISIBILITY",
]);

export const identityProviderEnum = pgEnum("identity_provider", [
  "EMAIL",
  "GOOGLE",
]);

export const identityAuthEffectStatusEnum = pgEnum(
  "identity_auth_effect_status",
  ["PENDING", "SYNCED", "FAILED"],
);

export const auditOperationEnum = pgEnum("audit_operation", [
  "INSERT",
  "UPDATE",
  "ARCHIVE",
  "RESTORE",
  "DELETE",
  "PRIVILEGED_READ",
]);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "USER",
  "ADMIN",
  "SYSTEM",
  "SYSTEM_UNKNOWN",
]);

export const auditSourceEnum = pgEnum("audit_source", [
  "APPLICATION",
  "BACKOFFICE",
  "AUTH_HOOK",
  "CRON",
  "SCRIPT",
  "DATABASE",
]);
