"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export interface ActionFeedbackState {
  message?: string;
  retryable?: boolean;
  status: string;
  title?: string;
}

export interface ActionFeedbackOptions<TState> {
  description?: string;
  errorStatuses?: readonly string[];
  errorTitle?: string;
  /** Renders a "Tentar de novo" toast action when the failed state is retryable. */
  onRetry?: (state: TState) => void;
  successStatuses?: readonly string[];
  title: string;
}

const defaultSuccessStatuses = ["success"] as const;
const defaultErrorStatuses = ["error"] as const;

/** Toasted states are tracked here so the same state object never toasts twice, whether it's reported from the wrapper action or from the effect below. */
const notifiedStates = new WeakSet<object>();

function markNotified(state: unknown) {
  if (typeof state !== "object" || state === null) {
    return true;
  }

  if (notifiedStates.has(state)) {
    return false;
  }

  notifiedStates.add(state);
  return true;
}

/**
 * Fires the success/error toast for one action state. Exported so a form's
 * own action wrapper can call it synchronously right after `await action(...)`
 * — `revalidatePath` can remount the tree before the effect below ever runs,
 * which would otherwise silently drop the feedback.
 */
export function emitActionFeedback<TState extends ActionFeedbackState>(
  state: TState,
  {
    description,
    errorStatuses = defaultErrorStatuses,
    errorTitle,
    onRetry,
    successStatuses = defaultSuccessStatuses,
    title,
  }: ActionFeedbackOptions<TState>,
) {
  if (!markNotified(state)) {
    return;
  }

  if (successStatuses.includes(state.status)) {
    toast.success(title, { description: state.message ?? description });
    return;
  }

  if (errorStatuses.includes(state.status)) {
    toast.error(state.title ?? errorTitle ?? "Não foi possível concluir", {
      action:
        state.retryable && onRetry
          ? { label: "Tentar de novo", onClick: () => onRetry(state) }
          : undefined,
      description: state.message,
      duration: 8_000,
    });
  }
}

/**
 * Toasts a form action's result and, on error, scrolls the error summary
 * into view and focuses it so it's never left hidden above the fold on a
 * long form. Attach the returned `errorAlertRef` to the alert/summary element
 * that shows `state.message`.
 */
export function useActionFeedback<TState extends ActionFeedbackState>(
  state: TState,
  options: ActionFeedbackOptions<TState>,
) {
  const previousState = useRef(state);
  const errorAlertRef = useRef<HTMLDivElement | null>(null);
  const {
    description,
    errorStatuses,
    errorTitle,
    onRetry,
    successStatuses,
    title,
  } = options;

  useEffect(() => {
    const isNewState = previousState.current !== state;
    previousState.current = state;

    if (!isNewState) {
      return;
    }

    emitActionFeedback(state, {
      description,
      errorStatuses,
      errorTitle,
      onRetry,
      successStatuses,
      title,
    });

    const activeErrorStatuses = errorStatuses ?? defaultErrorStatuses;
    if (activeErrorStatuses.includes(state.status)) {
      const node = errorAlertRef.current;
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
      node?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- individual option fields are the real deps; the options object is re-created every render.
  }, [state, description, errorTitle, onRetry, title]);

  return { errorAlertRef };
}

interface SuccessOnlyState {
  message?: string;
  status: string;
}

interface ActionSuccessToastOptions {
  description?: string;
  successStatuses?: readonly string[];
  title: string;
}

/** @deprecated Prefer `useActionFeedback`, which also handles errors. Kept so existing call sites keep their exact success-only behavior. */
export function useActionSuccessToast<TState extends SuccessOnlyState>(
  state: TState,
  options: ActionSuccessToastOptions,
) {
  useActionFeedback(state, { ...options, errorStatuses: [] });
}
