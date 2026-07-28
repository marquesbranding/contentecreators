import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import type { CatalogCreatorDetailViewDto } from "../types/catalog-detail-view.types";
import { catalogDetailKeys } from "../api/catalog-detail.api";
import { createUseCatalogDetail } from "./use-catalog-detail";

const creatorId = "10000000-0000-4000-8000-000000000001";
const detail: CatalogCreatorDetailViewDto = {
  bio: "Conteúdo.",
  contact: { reason: "VIEWER_NOT_COMPANY", status: "UNAVAILABLE" },
  creatorId,
  creatorType: "INFLUENCER",
  displayName: "Creator",
  location: { city: "Recife", state: "PE" },
  media: { avatar: null, cover: null },
  metrics: [],
  niches: [],
  socialProfiles: [],
};

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useCatalogDetail", () => {
  it("uses a stable key, renders initial data, and forwards cancellation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const fetchDetail = vi.fn(
      async (_creatorId: string, signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return detail;
      },
    );
    const useCatalogDetail = createUseCatalogDetail(fetchDetail);
    const { result } = renderHook(() => useCatalogDetail(creatorId, detail), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.data).toEqual(detail);
    expect(catalogDetailKeys.detail(creatorId)).toEqual([
      "catalog",
      "creator-detail",
      creatorId,
    ]);
    await waitFor(() => expect(fetchDetail).toHaveBeenCalled());
  });

  it("replaces protected initial data with null after eligibility loss", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const useCatalogDetail = createUseCatalogDetail(vi.fn(async () => null));
    const { result } = renderHook(() => useCatalogDetail(creatorId, detail), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.data).toBeNull());
    expect(
      queryClient.getQueryData(catalogDetailKeys.detail(creatorId)),
    ).toBeNull();
  });
});
