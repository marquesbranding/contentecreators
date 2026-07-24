import type {
  CompanyOnboardingDraftPayload,
  CreatorOnboardingDraftPayload,
} from "../schemas/onboarding-draft-schema";

export type OnboardingDraftRole = "INFLUENCER" | "COMPANY";
export type OnboardingDraftPayload =
  CreatorOnboardingDraftPayload | CompanyOnboardingDraftPayload;

export interface OnboardingDraftClientDto {
  payload: OnboardingDraftPayload;
  role: OnboardingDraftRole;
  updatedAt: string;
  version: number;
}

export type OnboardingDraftActionResult =
  | {
      draft: OnboardingDraftClientDto;
      kind: "saved";
    }
  | {
      currentVersion: number;
      kind: "conflict";
      message: string;
    }
  | {
      kind: "invalid" | "forbidden" | "unavailable";
      message: string;
    };

export type OnboardingDraftAction = (
  input: unknown,
) => Promise<OnboardingDraftActionResult>;
