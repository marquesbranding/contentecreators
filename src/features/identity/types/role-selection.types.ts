import type { RegistrationIntent } from "./auth.types";

export type ApplicationRole = RegistrationIntent | "ADMIN";
export type ApplicationAccountStatus =
  | "ONBOARDING"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "SUSPENDED"
  | "BANNED";

export interface IdentityAccountSummary {
  id: string;
  role: ApplicationRole | null;
  status: ApplicationAccountStatus;
}

export interface RoleSelectionActionState {
  status: "idle" | "error";
  message?: string;
  roleError?: string;
}

export type RoleSelectionAction = (
  previousState: RoleSelectionActionState,
  formData: FormData,
) => Promise<RoleSelectionActionState>;

export const initialRoleSelectionActionState: RoleSelectionActionState = {
  status: "idle",
};
