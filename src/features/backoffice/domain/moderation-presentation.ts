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

const availableActions: Record<
  BackofficeAccountStatus,
  readonly BackofficeModerationAction[]
> = {
  APPROVED: ["SUSPEND", "BAN", "ARCHIVE"],
  BANNED: ["UNBAN", "ARCHIVE"],
  CHANGES_REQUESTED: ["BAN", "ARCHIVE"],
  ONBOARDING: ["ARCHIVE"],
  PENDING_REVIEW: ["APPROVE", "REQUEST_CHANGES", "BAN", "ARCHIVE"],
  SUSPENDED: ["RESTORE", "BAN", "ARCHIVE"],
};

export function getModerationRoleLabel(role: BackofficeAccountRole) {
  return roleLabels[role];
}

export function getModerationStatusLabel(status: BackofficeAccountStatus) {
  return statusLabels[status];
}

export function getAvailableModerationActions(status: BackofficeAccountStatus) {
  return availableActions[status];
}
