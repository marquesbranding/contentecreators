import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FILTER_DEBOUNCE_MS,
  useDebouncedCallback,
  useDebouncedValue,
} from "./use-debounced-callback";

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits 550ms after the last call and runs once with the latest value", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback));

    act(() => result.current.run("a"));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.run("ab"));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.run("abc"));
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1));

    expect(callback).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("abc");
  });

  it("flush runs the pending call immediately and only once", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback));

    act(() => result.current.run("abc"));
    act(() => result.current.flush());
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS * 2));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("drops the pending call on unmount", () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(callback),
    );

    act(() => result.current.run("abc"));
    unmount();
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS * 2));

    expect(callback).not.toHaveBeenCalled();
  });
});

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("only exposes the value once it stopped changing", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value),
      { initialProps: { value: "" } },
    );

    rerender({ value: "a" });
    act(() => vi.advanceTimersByTime(300));
    rerender({ value: "ab" });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1));

    expect(result.current).toBe("");

    act(() => vi.advanceTimersByTime(1));

    expect(result.current).toBe("ab");
  });
});
