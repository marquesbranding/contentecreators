import type { AdminModerationAction } from "../../schemas/admin-moderation-command-schema";

export type AdminModerationActionCode =
  | "ADMIN_REQUIRED"
  | "CONFIRMATION_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SELF_APPROVAL_FORBIDDEN"
  | "STALE_REVIEW"
  | "UNKNOWN"
  | "VALIDATION_ERROR";

export type AdminModerationActionField =
  | "accountId"
  | "confirmation"
  | "expectedAccountVersion"
  | "expectedProfileVersion"
  | "idempotencyKey"
  | "reason";

export interface AdminModerationActionState {
  code?: AdminModerationActionCode;
  fieldErrors?: Partial<
    Record<AdminModerationActionField, string[] | undefined>
  >;
  message?: string;
  result?: {
    accountId: string;
    accountVersion: number;
    action: AdminModerationAction;
    kind: "already_applied" | "applied";
    profileVersion: number;
    status:
      | "APPROVED"
      | "BANNED"
      | "CHANGES_REQUESTED"
      | "ONBOARDING"
      | "PENDING_REVIEW"
      | "SUSPENDED";
  };
  status: "conflict" | "error" | "idle" | "success" | "unauthorized";
}
