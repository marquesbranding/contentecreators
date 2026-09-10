export type RegistrationIntent = "INFLUENCER" | "COMPANY";

/**
 * What the landing button asked the signup wizard to pre-select. Deliberately
 * NOT `RegistrationIntent`: that type doubles as the account role
 * (`ApplicationRole`), and `UGC` is a `creator_type`, not an `account_role`.
 */
export type SignUpAccountIntent = "INFLUENCER" | "UGC" | "COMPANY";

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
