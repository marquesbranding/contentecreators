"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Quiet time after the last keystroke before a filter input searches. */
export const FILTER_DEBOUNCE_MS = 550;

/**
 * Delays `callback` until `delayMs` passed since the last `run` call.
 * `flush` runs the pending call right away (Enter / submit); `cancel` drops it.
 * Anything still pending is dropped on unmount.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number = FILTER_DEBOUNCE_MS,
) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingArgsRef = useRef<Args | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
    pendingArgsRef.current = undefined;
  }, []);

  const flush = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
    const args = pendingArgsRef.current;
    pendingArgsRef.current = undefined;

    if (args) {
      callbackRef.current(...args);
    }
  }, []);

  const run = useCallback(
    (...args: Args) => {
      pendingArgsRef.current = args;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => cancel, [cancel]);

  return { cancel, flush, run };
}

/** `value`, but only after it stopped changing for `delayMs`. */
export function useDebouncedValue<Value>(
  value: Value,
  delayMs: number = FILTER_DEBOUNCE_MS,
) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}
