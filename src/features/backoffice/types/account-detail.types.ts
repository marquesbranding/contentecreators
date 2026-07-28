import type {
  BackofficeModerationHistoryItemDto,
  BackofficeReviewConsentDto,
  BackofficeReviewContactPreferencesDto,
  BackofficeReviewSocialProfileDto,
} from "./submission-review.types";
import type {
  ManagedAccountRole,
  ManagedAccountStatus,
} from "./account-management.types";

type SocialPlatform = BackofficeReviewSocialProfileDto["platform"];
type EmployeeRange =
  "11_TO_50" | "201_TO_500" | "51_TO_200" | "MORE_THAN_500" | "UP_TO_10";

export interface BackofficeAccountOperationalDto {
  approvedAt: string | null;
  archivedAt: string | null;
  bannedAt: string | null;
  completion: {
    percentage: number;
    version: number;
  };
  createdAt: string;
  id: string;
  operationalEmail: string;
  role: ManagedAccountRole | null;
  status: ManagedAccountStatus;
  submittedAt: string | null;
  suspendedAt: string | null;
  updatedAt: string;
  version: number;
}

export interface BackofficeAccountMediaDto {
  archivedAt: string | null;
  createdAt: string;
  height: number | null;
  id: string;
  kind: "AVATAR" | "COVER" | "LOGO";
  mimeType: string;
  replacedByAssetId: string | null;
  sizeBytes: number;
  status: "ACTIVE" | "ARCHIVED" | "PENDING" | "REJECTED";
  updatedAt: string;
  version: number;
  width: number | null;
}

export interface BackofficeInfluencerEditableProfileDto {
  avatarAssetId: string | null;
  bio: string;
  city: string;
  coverAssetId: string | null;
  creatorType: "INFLUENCER" | "UGC";
  displayName: string;
  engagementRate: number;
  followers: number;
  legalName: string;
  nicheSlugs: string[];
  socialPlatform: SocialPlatform;
  socialUrl: string;
  state: string;
  version: number;
  whatsapp: string;
}

export interface BackofficeCompanyEditableProfileDto {
  additionalLocations: Array<{
    city: string;
    complement: string;
    label: string;
    neighborhood: string;
    number: string;
    postalCode: string;
    state: string;
    street: string;
  }>;
  city: string;
  cnpj: string;
  complement: string;
  coverAssetId: string | null;
  description: string;
  employeeRange: EmployeeRange;
  legalName: string;
  logoAssetId: string | null;
  neighborhood: string;
  number: string;
  postalCode: string;
  segment: string;
  socialPlatform?: SocialPlatform;
  socialUrl?: string;
  state: string;
  street: string;
  tradeName: string;
  version: number;
  websiteUrl?: string;
  whatsapp: string;
}

export type BackofficeAccountProfileDto =
  | {
      editableProfile: BackofficeCompanyEditableProfileDto | null;
      kind: "COMPANY";
    }
  | {
      editableProfile: BackofficeInfluencerEditableProfileDto | null;
      kind: "INFLUENCER";
      niches: Array<{ name: string; slug: string }>;
      selfReportedMetrics: Array<{
        engagementRate: number | null;
        followerCount: number | null;
        observedOn: string;
        platform: SocialPlatform;
      }>;
    };

export interface BackofficeAccountDetailDto {
  account: BackofficeAccountOperationalDto;
  consents: BackofficeReviewConsentDto[];
  contactPreferences: BackofficeReviewContactPreferencesDto | null;
  media: BackofficeAccountMediaDto[];
  moderation: {
    assignedAdminAccountId: string | null;
    caseVersion: number;
    currentSubmissionSequence: number;
    history: BackofficeModerationHistoryItemDto[];
    resolvedAt: string | null;
    submittedAt: string | null;
  } | null;
  profile: BackofficeAccountProfileDto | null;
  socialProfiles: BackofficeReviewSocialProfileDto[];
}
