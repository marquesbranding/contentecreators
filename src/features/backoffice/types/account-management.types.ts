export type ManagedAccountRole = "ADMIN" | "COMPANY" | "INFLUENCER";

export type ManagedAccountStatus =
  | "APPROVED"
  | "BANNED"
  | "CHANGES_REQUESTED"
  | "ONBOARDING"
  | "PENDING_REVIEW"
  | "SUSPENDED";

export type ManagedAccountArchiveFilter = "ACTIVE" | "ALL" | "ARCHIVED";

export type ManagedAccountOrder =
  "COMPLETION_DESC" | "NAME_ASC" | "NEWEST" | "OLDEST";

export interface AccountManagementFilters {
  archive: ManagedAccountArchiveFilter;
  order: ManagedAccountOrder;
  page: number;
  pageSize: number;
  role?: ManagedAccountRole;
  search: string;
  status?: ManagedAccountStatus;
}

export interface ManagedAccountSummaryDto {
  accountId: string;
  archivedAt: string | null;
  completionPercentage: number;
  createdAt: string;
  displayName: string;
  operationalEmail: string;
  role: ManagedAccountRole | null;
  status: ManagedAccountStatus;
  updatedAt: string;
  version: number;
}

export interface AccountManagementResponseDto {
  items: ManagedAccountSummaryDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
