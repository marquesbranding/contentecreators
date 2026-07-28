export type ModerationQueueRole = "COMPANY" | "INFLUENCER";

export type ModerationQueueStatus =
  "APPROVED" | "BANNED" | "CHANGES_REQUESTED" | "PENDING_REVIEW" | "SUSPENDED";

export type ModerationQueueOrder =
  "NAME_ASC" | "NEWEST_SUBMITTED" | "OLDEST_SUBMITTED" | "PENDING_FIRST";

export interface ModerationQueueFilters {
  order: ModerationQueueOrder;
  page: number;
  pageSize: number;
  role: ModerationQueueRole;
  search: string;
  status?: ModerationQueueStatus;
}

export interface ModerationQueueItemDto {
  accountId: string;
  accountVersion: number;
  completionPercentage: number;
  completionVersion: number;
  displayName: string;
  profileVersion: number;
  role: ModerationQueueRole;
  status: ModerationQueueStatus;
  submittedAt: string;
}

export interface ModerationQueueCountsDto {
  /**
   * Actionable submissions (pending review or returned for corrections) for
   * each role, independent of the selected role/status filter.
   */
  byRole: Record<ModerationQueueRole, number>;
  /** Submitted accounts by status for the currently selected role. */
  byStatus: Record<ModerationQueueStatus, number>;
}

export interface ModerationQueueResponseDto {
  counts: ModerationQueueCountsDto;
  items: ModerationQueueItemDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
