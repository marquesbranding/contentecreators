"use client";

import { useCallback, useRef, useState } from "react";

type SubmitValidator = (event: React.FormEvent<HTMLFormElement>) => void;

export function useSubmitConfirmation() {
  const [open, setOpen] = useState(false);
  const confirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>, validate?: SubmitValidator) => {
      validate?.(event);

      if (event.defaultPrevented) {
        return;
      }

      if (confirmedRef.current) {
        confirmedRef.current = false;
        return;
      }

      event.preventDefault();
      formRef.current = event.currentTarget;
      setOpen(true);
    },
    [],
  );

  const confirmSubmission = useCallback(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    confirmedRef.current = true;
    setOpen(false);
    queueMicrotask(() => form.requestSubmit());
  }, []);

  return {
    confirmSubmission,
    handleSubmit,
    open,
    setOpen,
  };
}
