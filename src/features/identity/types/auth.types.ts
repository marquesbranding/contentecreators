export type RegistrationIntent = "INFLUENCER" | "COMPANY";

export type AuthFieldName = "email" | "password" | "passwordConfirmation";

export interface AuthActionState {
  status: "idle" | "error" | "success" | "confirmation_required";
  message?: string;
  fieldErrors?: Partial<Record<AuthFieldName, string[]>>;
  values?: {
    email?: string;
  };
}

export type AuthFormAction = (
  previousState: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;

export type AuthRedirectAction = (formData: FormData) => Promise<void>;

export const initialAuthActionState: AuthActionState = {
  status: "idle",
};
