import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  AuditHistoryFilters,
  AuditHistoryResponseDto,
} from "../types/audit-history.types";
import { createUseAuditHistory } from "./use-audit-history";

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

const emptyResponse: AuditHistoryResponseDto = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  },
};

describe("useAuditHistory", () => {
  it("passes TanStack Query cancellation and normalized filters to the API", async () => {
    const fetchHistory = vi.fn(
      async (_filters: AuditHistoryFilters, signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);

        return emptyResponse;
      },
    );
    const useAuditHistory = createUseAuditHistory(fetchHistory);
    const { result } = renderHook(
      () =>
        useAuditHistory({
          action: "UPDATE",
          entity: " accounts ",
          source: "BACKOFFICE",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchHistory).toHaveBeenCalledWith(
      {
        action: "UPDATE",
        actorAccountId: undefined,
        actorType: undefined,
        entity: "accounts",
        page: 1,
        pageSize: 20,
        periodFrom: undefined,
        periodTo: undefined,
        record: undefined,
        source: "BACKOFFICE",
      },
      expect.any(AbortSignal),
    );
  });
});
