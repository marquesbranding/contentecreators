import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  ModerationQueueFilters,
  ModerationQueueResponseDto,
} from "../types/moderation-queue.types";
import { createUseModerationQueue } from "./use-moderation-queue";

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

const emptyResponse: ModerationQueueResponseDto = {
  counts: {
    byRole: { COMPANY: 0, INFLUENCER: 0 },
    byStatus: {
      APPROVED: 0,
      BANNED: 0,
      CHANGES_REQUESTED: 0,
      PENDING_REVIEW: 0,
      SUSPENDED: 0,
    },
  },
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

describe("useModerationQueue", () => {
  it("passes React Query cancellation to the browser service", async () => {
    const fetchQueue = vi.fn(
      async (_filters: ModerationQueueFilters, signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return emptyResponse;
      },
    );
    const useModerationQueue = createUseModerationQueue(fetchQueue);
    const { result } = renderHook(
      () => useModerationQueue({ role: "COMPANY", search: "" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        order: "PENDING_FIRST",
        page: 1,
        pageSize: 20,
        role: "COMPANY",
      }),
      expect.any(AbortSignal),
    );
  });
});
