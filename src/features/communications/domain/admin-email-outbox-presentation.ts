import type {
  AdminEmailAttemptOutcome,
  AdminEmailOutboxStatus,
  AdminEmailRetryEligibility,
  AdminEmailTemplate,
} from "../types/admin-email-outbox.types";

const statusLabels: Record<AdminEmailOutboxStatus, string> = {
  DEAD_LETTER: "Falha definitiva",
  FAILED: "Nova tentativa automática",
  PENDING: "Pendente",
};

const templateLabels: Record<AdminEmailTemplate, string> = {
  APPROVED: "Cadastro aprovado",
  BANNED: "Conta bloqueada",
  CHANGES_REQUESTED: "Correções solicitadas",
  ONBOARDING_RECEIVED: "Cadastro recebido",
  RESTORED: "Acesso restaurado",
  SUSPENDED: "Acesso suspenso",
};

const outcomeLabels: Record<AdminEmailAttemptOutcome, string> = {
  AUTHENTICATION_FAILURE: "Falha de autenticação no provedor",
  CONNECTION_FAILURE: "Falha de conexão",
  DELIVERED: "Entregue ao provedor",
  OTHER_FAILURE: "Falha operacional",
  RECIPIENT_FAILURE: "Destinatário recusado pelo provedor",
  TEMPLATE_FAILURE: "Falha ao preparar a mensagem",
  TIMEOUT_FAILURE: "Tempo limite excedido",
  TLS_FAILURE: "Falha na conexão segura",
};

const retryExplanations: Record<AdminEmailRetryEligibility["reason"], string> =
  {
    AUTOMATIC_RETRY:
      "O sistema fará uma nova tentativa automaticamente no horário indicado.",
    ELIGIBLE:
      "A falha definitiva permite uma nova tentativa manual, preservando a mesma mensagem idempotente.",
    LIMIT_REACHED:
      "O limite operacional de tentativas manuais foi atingido. Investigue o provedor antes de prosseguir.",
    PENDING_DELIVERY:
      "A mensagem ainda aguarda a primeira tentativa e não precisa de intervenção manual.",
  };

export function getAdminEmailStatusLabel(status: AdminEmailOutboxStatus) {
  return statusLabels[status];
}

export function getAdminEmailTemplateLabel(template: AdminEmailTemplate) {
  return templateLabels[template];
}

export function getAdminEmailAttemptOutcomeLabel(
  outcome: AdminEmailAttemptOutcome,
) {
  return outcomeLabels[outcome];
}

export function getAdminEmailRetryExplanation(
  retry: AdminEmailRetryEligibility,
) {
  return retryExplanations[retry.reason];
}

export function formatAdminEmailTimestamp(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
