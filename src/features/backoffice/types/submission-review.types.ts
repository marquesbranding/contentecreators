type ReviewableRole = "COMPANY" | "INFLUENCER";
type AccountStatus =
  | "APPROVED"
  | "BANNED"
  | "CHANGES_REQUESTED"
  | "ONBOARDING"
  | "PENDING_REVIEW"
  | "SUSPENDED";
type CreatorType = "INFLUENCER" | "UGC";
type MediaKind = "AVATAR" | "COVER" | "LOGO" | "SPONSORSHIP_CREATIVE";
type MediaStatus = "ACTIVE" | "ARCHIVED" | "PENDING" | "REJECTED";
type ModerationAction =
  | "APPROVE"
  | "ARCHIVE"
  | "BAN"
  | "REQUEST_CHANGES"
  | "RESTORE"
  | "RESUBMIT"
  | "SUBMIT"
  | "SUSPEND"
  | "UNBAN";
type SocialPlatform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "OTHER"
  | "TELEGRAM"
  | "THREADS"
  | "TIKTOK"
  | "X"
  | "YOUTUBE";

export interface BackofficeReviewAccountDto {
  archivedAt: string | null;
  completion: {
    percentage: number;
    version: number;
  };
  id: string;
  operationalEmail: string;
  role: ReviewableRole;
  status: AccountStatus;
  submittedAt: string | null;
  version: number;
}

export interface BackofficeReviewMediaDto {
  height: number | null;
  id: string;
  kind: MediaKind;
  mimeType: string;
  status: MediaStatus;
  version: number;
  width: number | null;
}

export interface BackofficeReviewConsentDto {
  acceptedAt: string;
  contentHash: string;
  documentType: "CONTACT_VISIBILITY" | "PRIVACY" | "TERMS";
  isCurrent: boolean;
  versionLabel: string;
}

export interface BackofficeReviewContactPreferencesDto {
  emailVisibleToApprovedCompanies: boolean;
  socialVisibleToApprovedCompanies: boolean;
  version: number;
  whatsappVisibleToApprovedCompanies: boolean;
}

export interface BackofficeReviewSocialProfileDto {
  handle: string | null;
  platform: SocialPlatform;
  url: string;
  version: number;
}

export interface BackofficeModerationHistoryItemDto {
  action: ModerationAction;
  actorAccountId: string;
  fromStatus: AccountStatus;
  id: string;
  occurredAt: string;
  reason: string | null;
  submissionSequence: number;
  toStatus: AccountStatus;
}

interface BackofficeSubmissionReviewBaseDto {
  account: BackofficeReviewAccountDto;
  consents: BackofficeReviewConsentDto[];
  contactPreferences: BackofficeReviewContactPreferencesDto | null;
  media: BackofficeReviewMediaDto[];
  moderation: {
    caseVersion: number;
    currentSubmissionSequence: number;
    history: BackofficeModerationHistoryItemDto[];
  };
  socialProfiles: BackofficeReviewSocialProfileDto[];
}

export interface BackofficeInfluencerSubmissionReviewDto extends BackofficeSubmissionReviewBaseDto {
  profile: {
    bio: string | null;
    city: string | null;
    creatorType: CreatorType;
    displayName: string;
    legalName: string;
    niches: Array<{ name: string; slug: string }>;
    selfReportedMetrics: Array<{
      engagementRate: string | null;
      followerCount: number | null;
      observedOn: string;
      platform: SocialPlatform;
    }>;
    state: string | null;
    version: number;
    whatsappE164: string | null;
  };
  role: "INFLUENCER";
}

export interface BackofficeCompanySubmissionReviewDto extends BackofficeSubmissionReviewBaseDto {
  cnpjAssistance: {
    disclaimer: string;
    source: "USER_PROVIDED_EDITABLE_DATA";
  };
  profile: {
    cnpj: string;
    description: string | null;
    employeeRange: string | null;
    legalName: string;
    locations: Array<{
      city: string;
      complement: string | null;
      isPrimary: boolean;
      label: string;
      neighborhood: string | null;
      number: string;
      postalCode: string | null;
      state: string;
      street: string;
    }>;
    segment: string | null;
    tradeName: string;
    version: number;
    websiteUrl: string | null;
    whatsappE164: string | null;
  };
  role: "COMPANY";
}

export type BackofficeSubmissionReviewDto =
  | BackofficeCompanySubmissionReviewDto
  | BackofficeInfluencerSubmissionReviewDto;
