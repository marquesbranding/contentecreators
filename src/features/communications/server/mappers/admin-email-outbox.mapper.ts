import "server-only";

import type {
  AdminEmailAttemptDetailDto,
  AdminEmailAttemptOutcome,
  AdminEmailOutboxItemDto,
  AdminEmailOutboxStatus,
  AdminEmailTemplate,
} from "../../types/admin-email-outbox.types";

export interface AdminEmailOutboxSafeRow {
  accountId: string | null;
  attemptCount: number;
  createdAt: Date | string;
  dueAt: Date | string;
  id: string;
  maxAttempts: number;
  sentAt: Date | string | null;
  status: AdminEmailOutboxStatus;
  template: AdminEmailTemplate;
  updatedAt: Date | string;
}

export interface AdminEmailAttemptSafeRow {
  attemptNumber: number;
  attemptedAt: Date | string;
  errorCategory: string | null;
  latencyMs: number | null;
  status: "FAILED" | "SENT";
}

function serializeDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Email outbox contains an invalid operational timestamp.");
  }

  return date.toISOString();
}

function retryEligibility(
  row: AdminEmailOutboxSafeRow,
): AdminEmailOutboxItemDto["retry"] {
  if (row.status === "PENDING") {
    return { eligible: false, reason: "PENDING_DELIVERY" };
  }

  if (row.status === "FAILED") {
    return { eligible: false, reason: "AUTOMATIC_RETRY" };
  }

  if (row.sentAt !== null || row.maxAttempts >= 20) {
    return { eligible: false, reason: "LIMIT_REACHED" };
  }

  return { eligible: true, reason: "ELIGIBLE" };
}

function outcomeFromCategory(
  status: "FAILED" | "SENT",
  category: string | null,
): AdminEmailAttemptOutcome {
  if (status === "SENT") {
    return "DELIVERED";
  }

  const normalized = category?.trim().toUpperCase();

  if (normalized === "AUTHENTICATION" || normalized === "SMTP_CONFIGURATION") {
    return "AUTHENTICATION_FAILURE";
  }

  if (normalized === "CONNECTION" || normalized === "SMTP_TRANSIENT") {
    return "CONNECTION_FAILURE";
  }

  if (normalized === "RECIPIENT") {
    return "RECIPIENT_FAILURE";
  }

  if (normalized === "TEMPLATE") {
    return "TEMPLATE_FAILURE";
  }

  if (normalized === "TIMEOUT") {
    return "TIMEOUT_FAILURE";
  }

  if (normalized === "TLS") {
    return "TLS_FAILURE";
  }

  return "OTHER_FAILURE";
}

export function mapAdminEmailOutboxItem(
  row: AdminEmailOutboxSafeRow,
): AdminEmailOutboxItemDto {
  return {
    attemptCount: row.attemptCount,
    createdAt: serializeDate(row.createdAt),
    dueAt: serializeDate(row.dueAt),
    id: row.id,
    maxAttempts: row.maxAttempts,
    recipientReference: row.accountId
      ? `Conta ${row.accountId.slice(-8).toLowerCase()}`
      : "Destino do sistema",
    reference: `E-mail #${row.id.slice(0, 8).toLowerCase()}`,
    retry: retryEligibility(row),
    status: row.status,
    template: row.template,
    updatedAt: serializeDate(row.updatedAt),
  };
}

export function mapAdminEmailAttempt(
  row: AdminEmailAttemptSafeRow,
): AdminEmailAttemptDetailDto {
  return {
    attemptNumber: row.attemptNumber,
    attemptedAt: serializeDate(row.attemptedAt),
    latencyMs: row.latencyMs,
    outcome: outcomeFromCategory(row.status, row.errorCategory),
    status: row.status,
  };
}
