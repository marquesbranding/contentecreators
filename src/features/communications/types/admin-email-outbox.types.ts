export type AdminEmailOutboxStatus = "DEAD_LETTER" | "FAILED" | "PENDING";

export type AdminEmailTemplate =
  | "APPROVED"
  | "BANNED"
  | "CHANGES_REQUESTED"
  | "ONBOARDING_RECEIVED"
  | "RESTORED"
  | "SUSPENDED";

export type AdminEmailOutboxOrder =
  "ATTENTION_FIRST" | "NEWEST" | "NEXT_DUE" | "OLDEST";

export interface AdminEmailOutboxFilters {
  order: AdminEmailOutboxOrder;
  page: number;
  pageSize: number;
  status?: AdminEmailOutboxStatus;
  template?: AdminEmailTemplate;
}

export type AdminEmailRetryEligibility =
  | {
      eligible: true;
      reason: "ELIGIBLE";
    }
  | {
      eligible: false;
      reason: "AUTOMATIC_RETRY" | "LIMIT_REACHED" | "PENDING_DELIVERY";
    };

export type AdminEmailAttemptOutcome =
  | "AUTHENTICATION_FAILURE"
  | "CONNECTION_FAILURE"
  | "DELIVERED"
  | "OTHER_FAILURE"
  | "RECIPIENT_FAILURE"
  | "TEMPLATE_FAILURE"
  | "TIMEOUT_FAILURE"
  | "TLS_FAILURE";

export interface AdminEmailOutboxItemDto {
  attemptCount: number;
  createdAt: string;
  dueAt: string;
  id: string;
  maxAttempts: number;
  recipientReference: string;
  reference: string;
  retry: AdminEmailRetryEligibility;
  status: AdminEmailOutboxStatus;
  template: AdminEmailTemplate;
  updatedAt: string;
}

export interface AdminEmailAttemptDetailDto {
  attemptNumber: number;
  attemptedAt: string;
  latencyMs: number | null;
  outcome: AdminEmailAttemptOutcome;
  status: "FAILED" | "SENT";
}

export interface AdminEmailOutboxDetailDto {
  attempts: AdminEmailAttemptDetailDto[];
  item: AdminEmailOutboxItemDto;
}

export interface AdminEmailOutboxListDto {
  counts: Record<AdminEmailOutboxStatus, number>;
  items: AdminEmailOutboxItemDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
