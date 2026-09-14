import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSavedAtIndicator } from "./use-saved-at-indicator";

describe("useSavedAtIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the formatted time after marking a save and clears it after a few seconds", () => {
    const { result } = renderHook(() => useSavedAtIndicator());

    expect(result.current.savedAtLabel).toBeNull();

    act(() => {
      result.current.markSaved(new Date("2026-01-01T14:32:00"));
    });

    expect(result.current.savedAtLabel).toBe("Alterações salvas às 14:32");

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(result.current.savedAtLabel).toBeNull();
  });
});
