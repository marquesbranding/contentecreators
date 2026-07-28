import type {
  AuditActorType,
  AuditOperation,
  AuditSource,
} from "../types/audit-types";

const actionLabels: Record<AuditOperation, string> = {
  ARCHIVE: "Arquivamento",
  DELETE: "Exclusão",
  INSERT: "Inclusão",
  PRIVILEGED_READ: "Leitura privilegiada",
  RESTORE: "Restauração",
  UPDATE: "Atualização",
};

const actorTypeLabels: Record<AuditActorType, string> = {
  ADMIN: "Administrador",
  SYSTEM: "Sistema",
  SYSTEM_UNKNOWN: "Sistema não identificado",
  USER: "Usuário",
};

const sourceLabels: Record<AuditSource, string> = {
  APPLICATION: "Aplicação",
  AUTH_HOOK: "Hook de autenticação",
  BACKOFFICE: "Backoffice",
  CRON: "Rotina agendada",
  DATABASE: "Banco de dados",
  SCRIPT: "Script operacional",
};

const entityLabels: Record<string, string> = {
  account_consents: "Consentimentos",
  accounts: "Contas",
  blocked_identities: "Identidades bloqueadas",
  company_locations: "Endereços de empresa",
  company_profiles: "Perfis de empresa",
  creator_metric_snapshots: "Métricas de criador",
  creator_niches: "Nichos de criador",
  creator_profiles: "Perfis de criador",
  email_outbox: "Fila de e-mails",
  media_assets: "Mídias",
  moderation_cases: "Casos de moderação",
  moderation_events: "Eventos de moderação",
  social_profiles: "Redes sociais",
  sponsorship_placements: "Patrocínios",
};

export function getAuditActionLabel(action: AuditOperation) {
  return actionLabels[action];
}

export function getAuditActorTypeLabel(actorType: AuditActorType) {
  return actorTypeLabels[actorType];
}

export function getAuditSourceLabel(source: AuditSource) {
  return sourceLabels[source];
}

export function getAuditEntityLabel(entity: string) {
  return entityLabels[entity] ?? entity;
}

export function getAuditFieldLabel(field: string) {
  return field
    .replaceAll("_", " ")
    .replace(/^\p{Ll}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
}
