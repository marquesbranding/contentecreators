import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  AccountManagementFilters,
  AccountManagementResponseDto,
} from "../types/account-management.types";
import { createUseAccountManagement } from "./use-account-management";

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

const emptyResponse: AccountManagementResponseDto = {
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

describe("useAccountManagement", () => {
  it("passes React Query cancellation to the browser API", async () => {
    const fetchAccounts = vi.fn(
      async (_filters: AccountManagementFilters, signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return emptyResponse;
      },
    );
    const useAccountManagement = createUseAccountManagement(fetchAccounts);
    const { result } = renderHook(
      () => useAccountManagement({ archive: "ARCHIVED" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAccounts).toHaveBeenCalledWith(
      expect.objectContaining({
        archive: "ARCHIVED",
        order: "NEWEST",
        page: 1,
        pageSize: 20,
      }),
      expect.any(AbortSignal),
    );
  });
});
