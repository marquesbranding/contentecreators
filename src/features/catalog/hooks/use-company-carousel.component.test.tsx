import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  companyCarouselKeys,
  type CompanyCarouselViewResponseDto,
} from "../api/company-carousel.api";
import { createUseCompanyCarousel } from "./use-company-carousel";

const initialData: CompanyCarouselViewResponseDto = {
  items: [],
  limit: 12,
};

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useCompanyCarousel", () => {
  it("uses a stable bounded key and forwards cancellation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const fetchCarousel = vi.fn(async (_limit: number, signal: AbortSignal) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      return initialData;
    });
    const useCompanyCarousel = createUseCompanyCarousel(fetchCarousel);
    const { result } = renderHook(() => useCompanyCarousel(12, initialData), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.data).toEqual(initialData);
    expect(companyCarouselKeys.list(12)).toEqual([
      "catalog",
      "company-carousel",
      12,
    ]);
    await waitFor(() =>
      expect(fetchCarousel).toHaveBeenCalledWith(12, expect.any(AbortSignal)),
    );
  });
});
