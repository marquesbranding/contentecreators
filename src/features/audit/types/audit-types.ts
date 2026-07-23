export type AuditActorType = "USER" | "ADMIN" | "SYSTEM" | "SYSTEM_UNKNOWN";
export type AuditRole = "ADMIN" | "INFLUENCER" | "COMPANY" | null;
export type AuditOperation =
  "INSERT" | "UPDATE" | "ARCHIVE" | "RESTORE" | "DELETE" | "PRIVILEGED_READ";
export type AuditSource =
  "APPLICATION" | "BACKOFFICE" | "AUTH_HOOK" | "CRON" | "SCRIPT" | "DATABASE";

export interface AuditActor {
  accountId: string | null;
  actorType: AuditActorType;
  role: AuditRole;
}

export interface AuditRevisionInput {
  revision: number;
  entityTable: string;
  entityId: string;
  operation: AuditOperation;
  actorAccountId: string | null;
  actorType: AuditActorType;
  actorRole: AuditRole;
  source: AuditSource;
  requestId: string | null;
  reason: string | null;
  changedFields: string[];
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  occurredAt: Date;
}

export interface SafeAuditRevision {
  revision: number;
  entityTable: string;
  entityId: string;
  operation: AuditOperation;
  actor: AuditActor;
  source: AuditSource;
  requestId: string | null;
  reason: string | null;
  changes: Record<string, { before: unknown; after: unknown }>;
  occurredAt: string;
}
