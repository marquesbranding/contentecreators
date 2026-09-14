export type BackofficeAccountRole = "INFLUENCER" | "COMPANY";

export type BackofficeAccountStatus =
  | "ONBOARDING"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "SUSPENDED"
  | "BANNED";

export type BackofficeModerationAction =
  | "APPROVE"
  | "REQUEST_CHANGES"
  | "SUSPEND"
  | "RESTORE"
  | "BAN"
  | "UNBAN"
  | "ARCHIVE";

export type BackofficeMediaStatus =
  "ACTIVE" | "ARCHIVED" | "PENDING" | "REJECTED";

const roleLabels: Record<BackofficeAccountRole, string> = {
  COMPANY: "Empresa",
  INFLUENCER: "Influenciador",
};

const statusLabels: Record<BackofficeAccountStatus, string> = {
  APPROVED: "Aprovado",
  BANNED: "Banido",
  CHANGES_REQUESTED: "Correções solicitadas",
  ONBOARDING: "Cadastro em andamento",
  PENDING_REVIEW: "Aguardando análise",
  SUSPENDED: "Suspenso",
};

const mediaStatusLabels: Record<BackofficeMediaStatus, string> = {
  ACTIVE: "Ativa",
  ARCHIVED: "Arquivada",
  PENDING: "Pendente",
  REJECTED: "Rejeitada",
};

/**
 * Every action is available from any status other than its own destination —
 * a moderator can change their mind at any point — except ONBOARDING, which
 * only accepts BAN/ARCHIVE. RESTORE/UNBAN are no longer offered: APPROVE
 * from SUSPENDED/BANNED covers "restore", and leaving BANNED through any
 * action covers "unban".
 */
const availableActions: Record<
  BackofficeAccountStatus,
  readonly BackofficeModerationAction[]
> = {
  APPROVED: ["REQUEST_CHANGES", "SUSPEND", "BAN", "ARCHIVE"],
  BANNED: ["APPROVE", "REQUEST_CHANGES", "SUSPEND", "ARCHIVE"],
  CHANGES_REQUESTED: ["APPROVE", "SUSPEND", "BAN", "ARCHIVE"],
  ONBOARDING: ["BAN", "ARCHIVE"],
  PENDING_REVIEW: ["APPROVE", "REQUEST_CHANGES", "SUSPEND", "BAN", "ARCHIVE"],
  SUSPENDED: ["APPROVE", "REQUEST_CHANGES", "BAN", "ARCHIVE"],
};

export function getModerationRoleLabel(role: BackofficeAccountRole) {
  return roleLabels[role];
}

export function getModerationStatusLabel(status: BackofficeAccountStatus) {
  return statusLabels[status];
}

export function getMediaStatusLabel(status: BackofficeMediaStatus) {
  return mediaStatusLabels[status];
}

export function getAvailableModerationActions(status: BackofficeAccountStatus) {
  return availableActions[status];
}

/** APPROVE reverses a prior negative decision when coming from these
 * statuses, so it needs a reason too — mirrors `moderation-policy.ts`. */
const approveReasonRequiredFrom = new Set<BackofficeAccountStatus>([
  "SUSPENDED",
  "BANNED",
]);

export function moderationApproveRequiresReason(
  status: BackofficeAccountStatus,
) {
  return approveReasonRequiredFrom.has(status);
}
