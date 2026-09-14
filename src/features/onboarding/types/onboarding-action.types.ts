export interface OnboardingActionState {
  status: "idle" | "error" | "success" | "confirmation_required";
  message?: string;
  errorCode?: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
  retryable?: boolean;
  title?: string;
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
