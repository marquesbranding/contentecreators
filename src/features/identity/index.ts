export { AuthPageShell } from "./components/auth-page-shell";
export { AdminProvisioningForm } from "./components/admin-provisioning-form.client";
export { AuthenticatedProductShell } from "./components/authenticated-product-shell.client";
export { BackofficeAccessProvider } from "./components/backoffice-access-context.client";
export { ConfirmEmailForm } from "./components/confirm-email-form.client";
export { ForgotPasswordForm } from "./components/forgot-password-form.client";
export { LoginForm } from "./components/login-form.client";
export { RecoveryLinkUnavailable } from "./components/recovery-link-unavailable";
export { ResetPasswordForm } from "./components/reset-password-form.client";
export { ResetPasswordRecoveryGate } from "./components/reset-password-recovery-gate.client";
export { RoleSelectionForm } from "./components/role-selection-form.client";
export { RoleSelectionShell } from "./components/role-selection-shell";
export { SignUpForm } from "./components/sign-up-form.client";
export { sanitizeAuthReturnPath } from "./domain/auth-return-path";
export { sanitizeBackofficeReturnPath } from "./domain/backoffice-return-path";
export { getAccountDestination } from "./domain/account-route-decision";
export { parseRegistrationIntent } from "./domain/registration-intent";
export type {
  AuthActionState,
  AuthFormAction,
  AuthRedirectAction,
  RegistrationIntent,
} from "./types/auth.types";
export type {
  RoleSelectionAction,
  RoleSelectionActionState,
} from "./types/role-selection.types";
export type {
  AdminProvisioningAction,
  AdminProvisioningActionState,
} from "./types/admin-provisioning.types";
