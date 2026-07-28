import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  BackofficeAnalyticsFilters,
  BackofficeAnalyticsResponseDto,
} from "../types/backoffice-analytics.types";
import { createUseBackofficeAnalytics } from "./use-backoffice-analytics";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const emptyResponse: BackofficeAnalyticsResponseDto = {
  byRole: {
    COMPANY: {
      byStatus: {
        APPROVED: 0,
        BANNED: 0,
        CHANGES_REQUESTED: 0,
        ONBOARDING: 0,
        PENDING_REVIEW: 0,
        SUSPENDED: 0,
      },
      total: 0,
    },
    INFLUENCER: {
      byStatus: {
        APPROVED: 0,
        BANNED: 0,
        CHANGES_REQUESTED: 0,
        ONBOARDING: 0,
        PENDING_REVIEW: 0,
        SUSPENDED: 0,
      },
      total: 0,
    },
  },
  completion: {
    calculatorVersion: 1,
    completedProfiles: 0,
    percentage: 0,
    totalProfiles: 0,
  },
  newRegistrations: {
    byRole: { COMPANY: 0, INFLUENCER: 0 },
    total: 0,
  },
  period: {
    days: 30,
    endsAtExclusive: "2026-07-29T03:00:00.000Z",
    fromDate: "2026-06-29",
    startsAt: "2026-06-29T03:00:00.000Z",
    throughDate: "2026-07-28",
    timeZone: "America/Sao_Paulo",
  },
  totals: {
    awaitingApproval: 0,
    companies: 0,
    influencers: 0,
  },
};

describe("useBackofficeAnalytics", () => {
  it("normalizes filters and passes React Query cancellation to the API", async () => {
    const fetchAnalytics = vi.fn(
      async (_filters: BackofficeAnalyticsFilters, signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return emptyResponse;
      },
    );
    const useBackofficeAnalytics = createUseBackofficeAnalytics(fetchAnalytics);
    const { result } = renderHook(() => useBackofficeAnalytics({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAnalytics).toHaveBeenCalledWith(
      { periodDays: 30 },
      expect.any(AbortSignal),
    );
  });

  it("aborts the browser request when the final observer unmounts", async () => {
    let requestSignal: AbortSignal | undefined;
    const fetchAnalytics = vi.fn(
      (_filters: BackofficeAnalyticsFilters, signal: AbortSignal) => {
        requestSignal = signal;
        return new Promise<BackofficeAnalyticsResponseDto>(() => undefined);
      },
    );
    const useBackofficeAnalytics = createUseBackofficeAnalytics(fetchAnalytics);
    const { unmount } = renderHook(
      () => useBackofficeAnalytics({ periodDays: 7 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(requestSignal).toBeDefined());
    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });
});
