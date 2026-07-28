export const ADMIN_ANALYTICS_TIME_ZONE = "America/Sao_Paulo" as const;
export const ADMIN_ANALYTICS_ROLES = ["INFLUENCER", "COMPANY"] as const;
export const ADMIN_ANALYTICS_STATUSES = [
  "ONBOARDING",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SUSPENDED",
  "BANNED",
] as const;

export type AdminAnalyticsRole = (typeof ADMIN_ANALYTICS_ROLES)[number];
export type AdminAnalyticsStatus = (typeof ADMIN_ANALYTICS_STATUSES)[number];

export interface AdminAnalyticsPeriodInput {
  fromDate: string;
  throughDate: string;
}

export interface AdminAnalyticsPeriodDto extends AdminAnalyticsPeriodInput {
  days: number;
  endsAtExclusive: string;
  startsAt: string;
  timeZone: typeof ADMIN_ANALYTICS_TIME_ZONE;
}

export type AdminAnalyticsStatusCounts = Record<AdminAnalyticsStatus, number>;

export interface AdminAnalyticsRoleMetrics {
  byStatus: AdminAnalyticsStatusCounts;
  total: number;
}

export interface AdminAnalyticsDto {
  byRole: Record<AdminAnalyticsRole, AdminAnalyticsRoleMetrics>;
  completion: {
    calculatorVersion: number;
    completedProfiles: number;
    percentage: number;
    totalProfiles: number;
  };
  newRegistrations: {
    byRole: Record<AdminAnalyticsRole, number>;
    total: number;
  };
  period: AdminAnalyticsPeriodDto;
  totals: {
    awaitingApproval: number;
    companies: number;
    influencers: number;
  };
}

export interface AdminAnalyticsQueryBounds {
  endUtcExclusive: Date;
  period: AdminAnalyticsPeriodDto;
  startUtc: Date;
}
