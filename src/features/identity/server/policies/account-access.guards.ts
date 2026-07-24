import "server-only";

import type {
  CurrentAccountDto,
  CurrentSessionDto,
} from "../../types/current-account.types";
import type {
  ApplicationAccountStatus,
  ApplicationRole,
} from "../../types/role-selection.types";

export type AccountAccessErrorCode =
  | "ACCOUNT_REQUIRED"
  | "AUTHENTICATION_REQUIRED"
  | "OWNERSHIP_FORBIDDEN"
  | "ROLE_FORBIDDEN"
  | "STATUS_FORBIDDEN";

export class AccountAccessError extends Error {
  constructor(readonly code: AccountAccessErrorCode) {
    super(code);
    this.name = "AccountAccessError";
  }
}

type AuthenticatedSession = Extract<
  CurrentSessionDto,
  { kind: "authenticated" }
>;

export function requireAuthenticated(
  session: CurrentSessionDto,
): AuthenticatedSession {
  if (session.kind !== "authenticated") {
    throw new AccountAccessError("AUTHENTICATION_REQUIRED");
  }

  return session;
}

export function requireAccount(session: CurrentSessionDto): CurrentAccountDto {
  const authenticatedSession = requireAuthenticated(session);

  if (!authenticatedSession.account) {
    throw new AccountAccessError("ACCOUNT_REQUIRED");
  }

  return authenticatedSession.account;
}

export function requireOwner(
  account: CurrentAccountDto,
  ownerAccountId: string,
): CurrentAccountDto {
  if (account.id !== ownerAccountId) {
    throw new AccountAccessError("OWNERSHIP_FORBIDDEN");
  }

  return account;
}

export function requireApproved(account: CurrentAccountDto): CurrentAccountDto {
  return requireAllowedStatus(account, ["APPROVED"]);
}

export function requireRole(
  account: CurrentAccountDto,
  allowedRoles: readonly ApplicationRole[],
): CurrentAccountDto {
  if (!allowedRoles.includes(account.role)) {
    throw new AccountAccessError("ROLE_FORBIDDEN");
  }

  return account;
}

export function requireAdmin(account: CurrentAccountDto): CurrentAccountDto {
  requireRole(account, ["ADMIN"]);
  requireApproved(account);

  return account;
}

export function requireAllowedStatus(
  account: CurrentAccountDto,
  allowedStatuses: readonly ApplicationAccountStatus[],
): CurrentAccountDto {
  if (!allowedStatuses.includes(account.status)) {
    throw new AccountAccessError("STATUS_FORBIDDEN");
  }

  return account;
}
