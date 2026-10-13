export type AccountDeletionActionCode =
  | "INVALID_PASSWORD"
  | "NOT_AVAILABLE"
  | "RATE_LIMITED"
  | "REAUTH_REQUIRED"
  | "UNKNOWN"
  | "VALIDATION_ERROR";

export interface AccountDeletionActionState {
  code?: AccountDeletionActionCode;
  fieldErrors?: Partial<
    Record<"acknowledged" | "confirmation" | "password", string[]>
  >;
  message?: string;
  status: "error" | "idle";
}

export interface RecoverAccountActionState {
  fieldErrors?: Partial<Record<"accountId" | "reason", string[]>>;
  message?: string;
  status: "error" | "idle" | "success";
}

export interface RequestedAccountDeletion {
  accountId: string;
  authUserId: string;
  eliminationEligibleAt: Date;
  outboxId: string;
}

export interface RecoveredAccount {
  accountId: string;
  authUserId: string;
  outboxId: string;
}
