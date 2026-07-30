import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useOptionalPublicData } from "./use-optional-public-data";

afterEach(() => {
  vi.useRealTimers();
});

describe("useOptionalPublicData", () => {
  it("publishes optional data after a successful isolated request", async () => {
    const load = vi.fn(async () => ({ approvedCreators: 24 }));
    const { result } = renderHook(() => useOptionalPublicData(load));

    await waitFor(() =>
      expect(result.current).toEqual({ approvedCreators: 24 }),
    );
  });

  it("aborts a hanging enhancement without exposing an error", () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const load = vi.fn(
      (signal: AbortSignal) =>
        new Promise<null>(() => {
          requestSignal = signal;
        }),
    );
    const { result } = renderHook(() => useOptionalPublicData(load));

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(requestSignal?.aborted).toBe(true);
    expect(result.current).toBeNull();
  });
});
