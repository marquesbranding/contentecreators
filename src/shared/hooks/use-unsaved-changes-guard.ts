"use client";

import { useEffect } from "react";

export function useUnsavedChangesGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function preventAccidentalExit(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", preventAccidentalExit);

    return () => {
      window.removeEventListener("beforeunload", preventAccidentalExit);
    };
  }, [enabled]);
}
