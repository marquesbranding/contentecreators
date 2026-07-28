export type BackofficeAnalyticsPeriodDays = 7 | 30 | 90;

export interface BackofficeAnalyticsFilters {
  periodDays: BackofficeAnalyticsPeriodDays;
}

export type BackofficeAnalyticsFiltersInput =
  Partial<BackofficeAnalyticsFilters>;

export interface BackofficeAnalyticsStatusCountsDto {
  APPROVED: number;
  BANNED: number;
  CHANGES_REQUESTED: number;
  ONBOARDING: number;
  PENDING_REVIEW: number;
  SUSPENDED: number;
}

export interface BackofficeAnalyticsRoleSummaryDto {
  byStatus: BackofficeAnalyticsStatusCountsDto;
  total: number;
}

export interface BackofficeAnalyticsResponseDto {
  byRole: {
    COMPANY: BackofficeAnalyticsRoleSummaryDto;
    INFLUENCER: BackofficeAnalyticsRoleSummaryDto;
  };
  completion: {
    calculatorVersion: number;
    completedProfiles: number;
    percentage: number;
    totalProfiles: number;
  };
  newRegistrations: {
    byRole: {
      COMPANY: number;
      INFLUENCER: number;
    };
    total: number;
  };
  period: {
    days: BackofficeAnalyticsPeriodDays;
    endsAtExclusive: string;
    fromDate: string;
    startsAt: string;
    throughDate: string;
    timeZone: "America/Sao_Paulo";
  };
  totals: {
    awaitingApproval: number;
    companies: number;
    influencers: number;
  };
}
