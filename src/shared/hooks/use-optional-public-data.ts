"use client";

import { useEffect, useState } from "react";

const OPTIONAL_PUBLIC_DATA_TIMEOUT_MS = 4_000;

export type OptionalPublicDataLoader<T> = (
  signal: AbortSignal,
) => Promise<T | null>;

export function useOptionalPublicData<T>(
  load: OptionalPublicDataLoader<T>,
): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
    }, OPTIONAL_PUBLIC_DATA_TIMEOUT_MS);

    void load(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
        }
      })
      .catch(() => {
        // Optional landing enhancements fail closed without affecting the shell.
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [load]);

  return data;
}
