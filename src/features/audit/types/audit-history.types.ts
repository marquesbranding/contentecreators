import type {
  AuditActorType,
  AuditOperation,
  AuditRole,
  AuditSource,
} from "./audit-types";

export type AuditDisplayValue =
  | boolean
  | null
  | number
  | string
  | AuditDisplayValue[]
  | { [key: string]: AuditDisplayValue };

export interface AuditHistoryFilters {
  action?: AuditOperation;
  actorAccountId?: string;
  actorType?: AuditActorType;
  entity?: string;
  page: number;
  pageSize: number;
  periodFrom?: string;
  periodTo?: string;
  record?: string;
  source?: AuditSource;
}

export interface AuditHistoryChangeDto {
  after: AuditDisplayValue;
  before: AuditDisplayValue;
  field: string;
}

export interface AuditHistoryItemDto {
  action: AuditOperation;
  actor: {
    accountId: string | null;
    actorType: AuditActorType;
    role: AuditRole;
  };
  changes: AuditHistoryChangeDto[];
  entity: string;
  occurredAt: string;
  reason: string | null;
  record: string;
  requestId: string | null;
  revision: number;
  source: AuditSource;
}

export interface AuditHistoryResponseDto {
  items: AuditHistoryItemDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
