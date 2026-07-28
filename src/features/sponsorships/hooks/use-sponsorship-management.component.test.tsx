import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { HttpClientError } from "@/shared/api/http-client";

import { sponsorshipManagementKeys } from "../api/sponsorship-management.api";
import type {
  SponsorshipManagementFilters,
  SponsorshipManagementResponseDto,
} from "../api/sponsorship-management.contract";
import {
  createUseSponsorshipManagement,
  createUseSponsorshipPlacementMutations,
} from "./use-sponsorship-management";

const emptyResponse: SponsorshipManagementResponseDto = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  },
};

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { queryClient, Wrapper };
}

describe("sponsorship management hooks", () => {
  it("passes React Query cancellation to the list fetcher", async () => {
    const fetchPlacements = vi.fn(
      async (_filters: SponsorshipManagementFilters, signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return emptyResponse;
      },
    );
    const useSponsorshipManagement =
      createUseSponsorshipManagement(fetchPlacements);
    const { Wrapper } = createHarness();
    const { result } = renderHook(
      () => useSponsorshipManagement({ audience: "COMPANY" }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPlacements).toHaveBeenCalledWith(
      {
        audience: "COMPANY",
        page: 1,
        pageSize: 20,
        search: "",
      },
      expect.any(AbortSignal),
    );
  });

  it("aborts the in-flight list request when its observer unmounts", async () => {
    let receivedSignal: AbortSignal | undefined;
    const fetchPlacements = vi.fn(
      (_filters: SponsorshipManagementFilters, signal: AbortSignal) =>
        new Promise<SponsorshipManagementResponseDto>((_resolve, reject) => {
          receivedSignal = signal;
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const useSponsorshipManagement =
      createUseSponsorshipManagement(fetchPlacements);
    const { Wrapper } = createHarness();
    const { unmount } = renderHook(() => useSponsorshipManagement({}), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(receivedSignal).toBeInstanceOf(AbortSignal));
    unmount();

    expect(receivedSignal?.aborted).toBe(true);
  });

  it("invalidates sponsorship lists after a successful command", async () => {
    const command = vi.fn().mockResolvedValue({
      placement: {
        id: "f6000000-0000-4000-8000-000000000002",
      },
    });
    const { queryClient, Wrapper } = createHarness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const useMutations = createUseSponsorshipPlacementMutations({
      command,
      create: vi.fn(),
      update: vi.fn(),
    });
    const { result } = renderHook(() => useMutations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.command.mutateAsync({
        input: {
          action: "DEACTIVATE",
          expectedVersion: 2,
          reason: "Pausa operacional solicitada.",
        },
        placementId: "f6000000-0000-4000-8000-000000000002",
      });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["backoffice", "sponsorships", "list"],
    });
    expect(
      queryClient.getQueryData([
        "backoffice",
        "sponsorships",
        "detail",
        "f6000000-0000-4000-8000-000000000002",
      ]),
    ).toEqual({
      id: "f6000000-0000-4000-8000-000000000002",
    });
  });

  it("invalidates stale list and detail caches after a version conflict", async () => {
    const placementId = "f6000000-0000-4000-8000-000000000002";
    const command = vi.fn().mockRejectedValue(
      new HttpClientError({
        code: "REQUEST_ERROR",
        message: "Conflito.",
        status: 409,
      }),
    );
    const { queryClient, Wrapper } = createHarness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const useMutations = createUseSponsorshipPlacementMutations({
      command,
      create: vi.fn(),
      update: vi.fn(),
    });
    const { result } = renderHook(() => useMutations(), { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.command.mutateAsync({
          input: {
            action: "DEACTIVATE",
            expectedVersion: 1,
            reason: "Desativar placement desatualizado.",
          },
          placementId,
        }),
      ).rejects.toBeInstanceOf(HttpClientError);
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: sponsorshipManagementKeys.detail(placementId),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: sponsorshipManagementKeys.lists(),
    });
  });
});
