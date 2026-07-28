import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  AdminEmailOutboxDetailDto,
  AdminEmailOutboxFilters,
  AdminEmailOutboxListDto,
} from "../types/admin-email-outbox.types";
import {
  createUseAdminEmailOutboxDetail,
  createUseAdminEmailOutboxList,
} from "./use-admin-email-outbox";

const emptyList: AdminEmailOutboxListDto = {
  counts: { DEAD_LETTER: 0, FAILED: 0, PENDING: 0 },
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};
const detail: AdminEmailOutboxDetailDto = {
  attempts: [],
  item: {
    attemptCount: 5,
    createdAt: "2026-07-28T12:00:00.000Z",
    dueAt: "2026-07-28T13:00:00.000Z",
    id: "90000000-0000-4000-8000-000000000001",
    maxAttempts: 5,
    recipientReference: "Conta 00000001",
    reference: "E-mail #90000000",
    retry: { eligible: true, reason: "ELIGIBLE" },
    status: "DEAD_LETTER",
    template: "APPROVED",
    updatedAt: "2026-07-28T12:05:00.000Z",
  },
};

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

describe("admin email outbox query hooks", () => {
  it("passes query cancellation to list reads", async () => {
    const fetchList = vi.fn(
      async (_filters: AdminEmailOutboxFilters, signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return emptyList;
      },
    );
    const useList = createUseAdminEmailOutboxList(fetchList);
    const { result } = renderHook(() => useList({ status: "FAILED" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchList).toHaveBeenCalledWith(
      expect.objectContaining({
        order: "ATTENTION_FIRST",
        page: 1,
        pageSize: 20,
        status: "FAILED",
      }),
      expect.any(AbortSignal),
    );
  });

  it("does not read attempt detail until an item is selected", async () => {
    const fetchDetail = vi.fn(
      async (_outboxId: string, signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return detail;
      },
    );
    const useDetail = createUseAdminEmailOutboxDetail(fetchDetail);
    const { rerender, result } = renderHook(
      ({ outboxId }) => useDetail(outboxId),
      {
        initialProps: { outboxId: null as string | null },
        wrapper: createWrapper(),
      },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchDetail).not.toHaveBeenCalled();

    rerender({ outboxId: detail.item.id });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchDetail).toHaveBeenCalledWith(
      detail.item.id,
      expect.any(AbortSignal),
    );
  });
});
