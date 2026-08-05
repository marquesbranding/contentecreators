export interface OnboardingActionState {
  status: "idle" | "error" | "success" | "confirmation_required";
  message?: string;
  errorCode?: "account_already_exists";
  fieldErrors?: Record<string, string[]>;
  values?: {
    email?: string;
    role?: "INFLUENCER" | "COMPANY";
  };
}

export type OnboardingAction = (
  previousState: OnboardingActionState,
  formData: FormData,
) => Promise<OnboardingActionState>;

export const initialOnboardingActionState: OnboardingActionState = {
  status: "idle",
};
