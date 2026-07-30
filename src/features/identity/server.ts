import "server-only";

export { provisionAdditionalAdminAction } from "./server/actions/admin-provisioning.actions";
export {
  forgotPasswordAction,
  resendConfirmationAction,
  resetPasswordAction,
  signInBackofficeAction,
  signInAction,
  signOutAction,
  signUpAction,
  startBackofficeGoogleSignInAction,
  startGoogleSignInAction,
} from "./server/actions/auth.actions";
export { selectRoleAction } from "./server/actions/role-selection.actions";
export { updateProxyAuthSession } from "./server/services/proxy-auth-session";
export { createServerIdentityAuthService } from "./server/services/server-identity-auth.service";
export { createServerBackofficeAuthService } from "./server/services/server-backoffice-auth.service";
export { createServerBannedAccountDefenseService } from "./server/services/server-banned-account-defense.service";
export { createInitialAdminBootstrapService } from "./server/services/initial-admin-bootstrap.service";
export { createServerAdminProvisioningService } from "./server/services/server-admin-provisioning.service";
export { createServerRoleSelectionService } from "./server/services/server-role-selection.service";
export {
  getServerCurrentAccount,
  getServerCurrentSession,
  resolveFreshServerCurrentSession,
} from "./server/dal/current-account";
export {
  AccountAccessError,
  requireAccount,
  requireAdmin,
  requireAllowedStatus,
  requireApproved,
  requireAuthenticated,
  requireOwner,
  requireRole,
} from "./server/policies/account-access.guards";
export {
  createServerVerifiedAccountTransactionRunner,
  createSupabaseVerifiedAuthUserIdResolver,
  createVerifiedAccountTransactionRunner,
  VerifiedAccountTransactionError,
} from "./server/services/verified-account-transaction";
export type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
  VerifiedAccountTransactionErrorCode,
} from "./server/services/verified-account-transaction";
export type { AccountAccessErrorCode } from "./server/policies/account-access.guards";
export type {
  CurrentAccountDto,
  CurrentSessionDto,
} from "./types/current-account.types";
