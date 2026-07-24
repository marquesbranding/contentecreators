import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { AxiosInstance } from "axios";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { HttpClientError } from "@/shared/api/http-client";

import {
  createUseCnpjLookup,
  type CnpjLookupUiStatus,
} from "./use-cnpj-lookup";

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

describe("useCnpjLookup", () => {
  it("waits for a valid debounced CNPJ and forwards the cancellation signal", async () => {
    const get = vi.fn().mockResolvedValue({
      data: { status: "not_found" },
    });
    const useCnpjLookup = createUseCnpjLookup(
      {
        get,
      } as unknown as AxiosInstance,
      { debounceMs: 1 },
    );
    const { result } = renderHook(() => useCnpjLookup("11.222.333/0001-81"), {
      wrapper: createWrapper(),
    });

    expect(result.current.lookupStatus).toBe("idle");
    expect(get).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current.lookupStatus).toBe("not_found"));
    expect(get).toHaveBeenCalledWith("/company-registry/cnpj/11222333000181", {
      signal: expect.any(AbortSignal),
    });
    expect(result.current.manualEntryAvailable).toBe(true);
  });

  it("does not request invalid CNPJ values", async () => {
    const get = vi.fn();
    const useCnpjLookup = createUseCnpjLookup(
      {
        get,
      } as unknown as AxiosInstance,
      { debounceMs: 1 },
    );
    const { result } = renderHook(() => useCnpjLookup("12.345"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.lookupStatus).toBe("idle"));
    await waitFor(() => expect(get).not.toHaveBeenCalled());
  });

  it.each([
    ["TIMEOUT", "timeout"],
    ["RATE_LIMITED", "rate_limited"],
    ["NETWORK_ERROR", "unavailable"],
  ] as const)(
    "maps the normalized %s error to %s",
    async (code, expectedStatus) => {
      const get = vi.fn().mockRejectedValue(
        new HttpClientError({
          code,
          message: "safe error",
          status: code === "RATE_LIMITED" ? 429 : undefined,
        }),
      );
      const useCnpjLookup = createUseCnpjLookup(
        {
          get,
        } as unknown as AxiosInstance,
        { debounceMs: 1 },
      );
      const { result } = renderHook(() => useCnpjLookup("11222333000181"), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(result.current.lookupStatus).toBe<CnpjLookupUiStatus>(
          expectedStatus,
        ),
      );
      expect(result.current.manualEntryAvailable).toBe(true);
    },
  );

  it.each([
    ["not_found", "not_found"],
    ["timeout", "timeout"],
    ["rate_limited", "rate_limited"],
    ["unavailable", "unavailable"],
    ["malformed_response", "unavailable"],
  ] as const)(
    "exposes the typed provider result %s as UI state %s",
    async (providerStatus, expectedStatus) => {
      const get = vi.fn().mockResolvedValue({
        data: { status: providerStatus },
      });
      const useCnpjLookup = createUseCnpjLookup(
        {
          get,
        } as unknown as AxiosInstance,
        { debounceMs: 1 },
      );
      const { result } = renderHook(() => useCnpjLookup("11222333000181"), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(result.current.lookupStatus).toBe(expectedStatus),
      );
    },
  );
});
