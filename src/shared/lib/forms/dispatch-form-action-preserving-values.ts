"use client";

import { startTransition } from "react";

type FormActionDispatcher = (formData: FormData) => void;

/**
 * Dispatches a React form action without using the native form-action reset.
 * This keeps every value in place when the server returns a validation error.
 */
export function dispatchFormActionPreservingValues(
  event: React.FormEvent<HTMLFormElement>,
  action: FormActionDispatcher,
) {
  if (event.defaultPrevented) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  startTransition(() => action(formData));
}
