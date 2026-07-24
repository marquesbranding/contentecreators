import { isValidCnpj } from "./cnpj";

export const PROFILE_COMPLETION_VERSION = 1 as const;
export type ProfileCompletionRole = "INFLUENCER" | "COMPANY";

const supportedSocialPlatforms = new Set([
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
  "OTHER",
]);
const supportedEmployeeRanges = new Set([
  "UP_TO_10",
  "11_TO_50",
  "51_TO_200",
  "201_TO_500",
  "MORE_THAN_500",
]);

export type CreatorProfileCompletionField =
  | "verifiedEmail"
  | "legalName"
  | "displayName"
  | "whatsapp"
  | "creatorType"
  | "location"
  | "niches"
  | "bio"
  | "socialProfile"
  | "metricSnapshot"
  | "avatar"
  | "cover";

export type CompanyProfileCompletionField =
  | "verifiedEmail"
  | "legalName"
  | "tradeName"
  | "cnpj"
  | "employeeRange"
  | "segment"
  | "whatsapp"
  | "description"
  | "primaryLocation"
  | "website"
  | "socialProfile"
  | "additionalLocation"
  | "logo"
  | "cover";

export type ProfileCompletionField =
  CreatorProfileCompletionField | CompanyProfileCompletionField;

type CompletionMediaKind = "AVATAR" | "LOGO" | "COVER";

export interface ProfileCompletionMediaInput {
  archivedAt?: Date | string | null;
  kind?: CompletionMediaKind;
  ownerMatches?: boolean;
  status?: "PENDING" | "ACTIVE" | "ARCHIVED";
}

export interface ProfileCompletionSocialInput {
  archivedAt?: Date | string | null;
  normalizedUrl?: string | null;
  platform?: string | null;
}

export interface ProfileCompletionMetricInput {
  engagementRate?: number | string | null;
  followerCount?: number | null;
  observedOn?: Date | string | null;
}

export interface ProfileCompletionLocationInput {
  city?: string | null;
  isPrimary?: boolean;
  neighborhood?: string | null;
  number?: string | null;
  postalCode?: string | null;
  state?: string | null;
  street?: string | null;
}

export interface CreatorProfileCompletionInput {
  avatar?: ProfileCompletionMediaInput;
  bio?: string | null;
  city?: string | null;
  cover?: ProfileCompletionMediaInput;
  creatorType?: string | null;
  displayName?: string | null;
  emailVerified?: boolean;
  legalName?: string | null;
  metricSnapshots?: ProfileCompletionMetricInput[];
  nicheSlugs?: string[];
  role: "INFLUENCER";
  socialProfiles?: ProfileCompletionSocialInput[];
  state?: string | null;
  whatsapp?: string | null;
}

export interface CompanyProfileCompletionInput {
  additionalLocations?: ProfileCompletionLocationInput[];
  cnpj?: string | null;
  cover?: ProfileCompletionMediaInput;
  description?: string | null;
  emailVerified?: boolean;
  employeeRange?: string | null;
  legalName?: string | null;
  logo?: ProfileCompletionMediaInput;
  primaryLocation?: ProfileCompletionLocationInput;
  role: "COMPANY";
  segment?: string | null;
  socialProfiles?: ProfileCompletionSocialInput[];
  tradeName?: string | null;
  websiteUrl?: string | null;
  whatsapp?: string | null;
}

export type ProfileCompletionInput =
  CreatorProfileCompletionInput | CompanyProfileCompletionInput;

export interface ProfileCompletionResult<
  Field extends ProfileCompletionField = ProfileCompletionField,
> {
  completedWeight: number;
  missingFields: Field[];
  percentage: number;
  totalWeight: 100;
  version: typeof PROFILE_COMPLETION_VERSION;
}

interface CompletionRule<Field extends ProfileCompletionField> {
  field: Field;
  isComplete: () => boolean;
  weight: number;
}

export const CREATOR_COMPLETION_WEIGHTS = {
  verifiedEmail: 6,
  legalName: 7,
  displayName: 7,
  whatsapp: 7,
  creatorType: 7,
  location: 7,
  niches: 7,
  bio: 7,
  socialProfile: 7,
  metricSnapshot: 7,
  avatar: 16,
  cover: 15,
} as const satisfies Record<CreatorProfileCompletionField, number>;

export const COMPANY_COMPLETION_WEIGHTS = {
  verifiedEmail: 5,
  legalName: 6,
  tradeName: 6,
  cnpj: 8,
  employeeRange: 6,
  segment: 6,
  whatsapp: 6,
  description: 8,
  primaryLocation: 10,
  website: 7,
  socialProfile: 7,
  additionalLocation: 5,
  logo: 10,
  cover: 10,
} as const satisfies Record<CompanyProfileCompletionField, number>;

function hasText(value: string | null | undefined, minimumLength = 1) {
  return Boolean(value && value.trim().length >= minimumLength);
}

function isBrazilianState(value: string | null | undefined) {
  return Boolean(value && /^[A-Z]{2}$/u.test(value.trim().toUpperCase()));
}

function isBrazilianWhatsapp(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const digits = value.replace(/\D/gu, "");
  return (
    digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
  );
}

function isSafeUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isActiveMedia(
  media: ProfileCompletionMediaInput | undefined,
  expectedKind: CompletionMediaKind,
) {
  return Boolean(
    media &&
    media.archivedAt == null &&
    media.kind === expectedKind &&
    media.ownerMatches === true &&
    media.status === "ACTIVE",
  );
}

function hasSocialProfile(
  socialProfiles: ProfileCompletionSocialInput[] | undefined,
) {
  return Boolean(
    socialProfiles?.some(
      (profile) =>
        profile.archivedAt == null &&
        Boolean(profile.platform) &&
        supportedSocialPlatforms.has(profile.platform ?? "") &&
        isSafeUrl(profile.normalizedUrl),
    ),
  );
}

function hasMetricSnapshot(
  metricSnapshots: ProfileCompletionMetricInput[] | undefined,
) {
  return Boolean(
    metricSnapshots?.some((snapshot) => {
      const engagementRate = Number(snapshot.engagementRate);
      const observedTime =
        snapshot.observedOn instanceof Date
          ? snapshot.observedOn.getTime()
          : Date.parse(snapshot.observedOn ?? "");

      return (
        Number.isInteger(snapshot.followerCount) &&
        (snapshot.followerCount ?? -1) >= 0 &&
        Number.isFinite(engagementRate) &&
        engagementRate >= 0 &&
        engagementRate <= 100 &&
        Number.isFinite(observedTime)
      );
    }),
  );
}

function isCompleteLocation(
  location: ProfileCompletionLocationInput | undefined,
) {
  return Boolean(
    location &&
    hasText(location.city, 2) &&
    hasText(location.neighborhood, 2) &&
    hasText(location.number) &&
    /^\d{8}$/u.test(location.postalCode ?? "") &&
    isBrazilianState(location.state) &&
    hasText(location.street, 3),
  );
}

function evaluateRules<Field extends ProfileCompletionField>(
  rules: CompletionRule<Field>[],
): ProfileCompletionResult<Field> {
  const missingFields: Field[] = [];
  let completedWeight = 0;

  for (const rule of rules) {
    if (rule.isComplete()) {
      completedWeight += rule.weight;
    } else {
      missingFields.push(rule.field);
    }
  }

  return {
    completedWeight,
    missingFields,
    percentage: Math.round(completedWeight),
    totalWeight: 100,
    version: PROFILE_COMPLETION_VERSION,
  };
}

function calculateCreatorCompletion(
  input: CreatorProfileCompletionInput,
): ProfileCompletionResult<CreatorProfileCompletionField> {
  return evaluateRules([
    {
      field: "verifiedEmail",
      isComplete: () => input.emailVerified === true,
      weight: CREATOR_COMPLETION_WEIGHTS.verifiedEmail,
    },
    {
      field: "legalName",
      isComplete: () => hasText(input.legalName, 3),
      weight: CREATOR_COMPLETION_WEIGHTS.legalName,
    },
    {
      field: "displayName",
      isComplete: () => hasText(input.displayName, 2),
      weight: CREATOR_COMPLETION_WEIGHTS.displayName,
    },
    {
      field: "whatsapp",
      isComplete: () => isBrazilianWhatsapp(input.whatsapp),
      weight: CREATOR_COMPLETION_WEIGHTS.whatsapp,
    },
    {
      field: "creatorType",
      isComplete: () =>
        input.creatorType === "INFLUENCER" || input.creatorType === "UGC",
      weight: CREATOR_COMPLETION_WEIGHTS.creatorType,
    },
    {
      field: "location",
      isComplete: () => hasText(input.city, 2) && isBrazilianState(input.state),
      weight: CREATOR_COMPLETION_WEIGHTS.location,
    },
    {
      field: "niches",
      isComplete: () =>
        Boolean(
          input.nicheSlugs?.some((slug) =>
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug),
          ),
        ),
      weight: CREATOR_COMPLETION_WEIGHTS.niches,
    },
    {
      field: "bio",
      isComplete: () => hasText(input.bio, 30),
      weight: CREATOR_COMPLETION_WEIGHTS.bio,
    },
    {
      field: "socialProfile",
      isComplete: () => hasSocialProfile(input.socialProfiles),
      weight: CREATOR_COMPLETION_WEIGHTS.socialProfile,
    },
    {
      field: "metricSnapshot",
      isComplete: () => hasMetricSnapshot(input.metricSnapshots),
      weight: CREATOR_COMPLETION_WEIGHTS.metricSnapshot,
    },
    {
      field: "avatar",
      isComplete: () => isActiveMedia(input.avatar, "AVATAR"),
      weight: CREATOR_COMPLETION_WEIGHTS.avatar,
    },
    {
      field: "cover",
      isComplete: () => isActiveMedia(input.cover, "COVER"),
      weight: CREATOR_COMPLETION_WEIGHTS.cover,
    },
  ]);
}

function calculateCompanyCompletion(
  input: CompanyProfileCompletionInput,
): ProfileCompletionResult<CompanyProfileCompletionField> {
  return evaluateRules([
    {
      field: "verifiedEmail",
      isComplete: () => input.emailVerified === true,
      weight: COMPANY_COMPLETION_WEIGHTS.verifiedEmail,
    },
    {
      field: "legalName",
      isComplete: () => hasText(input.legalName, 3),
      weight: COMPANY_COMPLETION_WEIGHTS.legalName,
    },
    {
      field: "tradeName",
      isComplete: () => hasText(input.tradeName, 2),
      weight: COMPANY_COMPLETION_WEIGHTS.tradeName,
    },
    {
      field: "cnpj",
      isComplete: () => isValidCnpj(input.cnpj ?? ""),
      weight: COMPANY_COMPLETION_WEIGHTS.cnpj,
    },
    {
      field: "employeeRange",
      isComplete: () => supportedEmployeeRanges.has(input.employeeRange ?? ""),
      weight: COMPANY_COMPLETION_WEIGHTS.employeeRange,
    },
    {
      field: "segment",
      isComplete: () => hasText(input.segment, 2),
      weight: COMPANY_COMPLETION_WEIGHTS.segment,
    },
    {
      field: "whatsapp",
      isComplete: () => isBrazilianWhatsapp(input.whatsapp),
      weight: COMPANY_COMPLETION_WEIGHTS.whatsapp,
    },
    {
      field: "description",
      isComplete: () => hasText(input.description, 30),
      weight: COMPANY_COMPLETION_WEIGHTS.description,
    },
    {
      field: "primaryLocation",
      isComplete: () =>
        input.primaryLocation?.isPrimary === true &&
        isCompleteLocation(input.primaryLocation),
      weight: COMPANY_COMPLETION_WEIGHTS.primaryLocation,
    },
    {
      field: "website",
      isComplete: () => isSafeUrl(input.websiteUrl),
      weight: COMPANY_COMPLETION_WEIGHTS.website,
    },
    {
      field: "socialProfile",
      isComplete: () => hasSocialProfile(input.socialProfiles),
      weight: COMPANY_COMPLETION_WEIGHTS.socialProfile,
    },
    {
      field: "additionalLocation",
      isComplete: () =>
        Boolean(
          input.additionalLocations?.some(
            (location) =>
              location.isPrimary === false && isCompleteLocation(location),
          ),
        ),
      weight: COMPANY_COMPLETION_WEIGHTS.additionalLocation,
    },
    {
      field: "logo",
      isComplete: () => isActiveMedia(input.logo, "LOGO"),
      weight: COMPANY_COMPLETION_WEIGHTS.logo,
    },
    {
      field: "cover",
      isComplete: () => isActiveMedia(input.cover, "COVER"),
      weight: COMPANY_COMPLETION_WEIGHTS.cover,
    },
  ]);
}

export function calculateProfileCompletion(
  input: CreatorProfileCompletionInput,
): ProfileCompletionResult<CreatorProfileCompletionField>;
export function calculateProfileCompletion(
  input: CompanyProfileCompletionInput,
): ProfileCompletionResult<CompanyProfileCompletionField>;
export function calculateProfileCompletion(
  input: ProfileCompletionInput,
): ProfileCompletionResult {
  return input.role === "COMPANY"
    ? calculateCompanyCompletion(input)
    : calculateCreatorCompletion(input);
}
