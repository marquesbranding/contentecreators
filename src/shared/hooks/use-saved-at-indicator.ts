"use client";

import { useCallback, useEffect, useState } from "react";

const VISIBLE_DURATION_MS = 4_000;

/** Drives the small "✓ Alterações salvas às HH:MM" text next to a save button — visible for a few seconds after each successful save, then gone. */
export function useSavedAtIndicator() {
  const [savedAtLabel, setSavedAtLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!savedAtLabel) {
      return;
    }

    const timeout = setTimeout(() => setSavedAtLabel(null), VISIBLE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [savedAtLabel]);

  const markSaved = useCallback((at: Date = new Date()) => {
    setSavedAtLabel(
      `Alterações salvas às ${at.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    );
  }, []);

  return { markSaved, savedAtLabel };
}
