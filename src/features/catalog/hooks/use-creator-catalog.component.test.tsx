import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { HttpClientError } from "@/shared/api/http-client";

import { creatorCatalogKeys } from "../api/creator-catalog.api";
import type { CreatorCatalogBrowserPageDto } from "../api/creator-catalog.contract";
import type { CreatorCatalogFilters } from "../types/creator-catalog.types";
import { createUseCreatorCatalog } from "./use-creator-catalog";

const filters: CreatorCatalogFilters = {
  pageSize: 20,
  search: "Moda",
};

const firstPage: CreatorCatalogBrowserPageDto = {
  items: [
    {
      avatar: null,
      bioExcerpt: "Conteúdo sobre moda.",
      city: "Recife",
      creatorId: "a0000000-0000-4000-8000-000000000001",
      creatorType: "INFLUENCER",
      displayName: "Ana",
      niches: [{ name: "Moda", slug: "moda" }],
      socialPlatforms: ["INSTAGRAM"],
      state: "PE",
    },
  ],
  nextCursor: "second_page",
  pageSize: 20,
};

const secondPage: CreatorCatalogBrowserPageDto = {
  items: [],
  nextCursor: null,
  pageSize: 20,
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Number.POSITIVE_INFINITY,
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  });
}

describe("useCreatorCatalog", () => {
  it("hydrates the infinite-query shape without issuing a duplicate request", () => {
    const fetchPage =
      vi.fn<
        (
          filters: CreatorCatalogFilters,
          signal: AbortSignal,
        ) => Promise<CreatorCatalogBrowserPageDto>
      >();
    const useCreatorCatalog = createUseCreatorCatalog(fetchPage);
    const { result } = renderHook(
      () => useCreatorCatalog({ filters, initialPage: firstPage }),
      { wrapper: createWrapper(createClient()) },
    );

    expect(result.current.items).toEqual(firstPage.items);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.announcement).toBe("1 criador carregado.");
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("passes AbortSignal and the next cursor without changing the page bound", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);
    const useCreatorCatalog = createUseCreatorCatalog(fetchPage);
    const { result } = renderHook(() => useCreatorCatalog({ filters }), {
      wrapper: createWrapper(createClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPage).toHaveBeenNthCalledWith(
      1,
      { ...filters, cursor: undefined },
      expect.any(AbortSignal),
    );

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(fetchPage).toHaveBeenNthCalledWith(
      2,
      { ...filters, cursor: "second_page" },
      expect.any(AbortSignal),
    );
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it("aborts the Axios-compatible request when the observer unmounts", async () => {
    let receivedSignal: AbortSignal | undefined;
    const fetchPage = vi.fn(
      (_filters: CreatorCatalogFilters, signal: AbortSignal) =>
        new Promise<CreatorCatalogBrowserPageDto>((_resolve, reject) => {
          receivedSignal = signal;
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const useCreatorCatalog = createUseCreatorCatalog(fetchPage);
    const { unmount } = renderHook(() => useCreatorCatalog({ filters }), {
      wrapper: createWrapper(createClient()),
    });

    await waitFor(() => expect(receivedSignal).toBeInstanceOf(AbortSignal));
    unmount();

    expect(receivedSignal?.aborted).toBe(true);
  });

  it.each([
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
  ] as const)(
    "removes all protected catalog data after %s",
    async (code, status) => {
      const queryClient = createClient();
      queryClient.setQueryData(
        [...creatorCatalogKeys.protected(), "detail", "creator-id"],
        { privateContact: "removed" },
      );
      queryClient.setQueryData(["unrelated"], { keep: true });
      const fetchPage = vi.fn().mockRejectedValue(
        new HttpClientError({
          code,
          message: "Acesso encerrado.",
          status,
        }),
      );
      const useCreatorCatalog = createUseCreatorCatalog(fetchPage);
      const { result } = renderHook(() => useCreatorCatalog({ filters }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() =>
        expect(result.current.isAuthorizationStale).toBe(true),
      );

      expect(
        queryClient.getQueriesData({
          queryKey: creatorCatalogKeys.protected(),
        }),
      ).toEqual([]);
      expect(queryClient.getQueryData(["unrelated"])).toEqual({ keep: true });
      expect(result.current.announcement).toBe(
        "Seu acesso ao catálogo não está mais disponível.",
      );
    },
  );
});
