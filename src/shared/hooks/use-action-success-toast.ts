"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ActionFeedbackState {
  message?: string;
  status: string;
}

interface ActionSuccessToastOptions {
  description?: string;
  successStatuses?: readonly string[];
  title: string;
}

const defaultSuccessStatuses = ["success"] as const;

export function useActionSuccessToast<TState extends ActionFeedbackState>(
  state: TState,
  {
    description,
    successStatuses = defaultSuccessStatuses,
    title,
  }: ActionSuccessToastOptions,
) {
  const previousState = useRef(state);

  useEffect(() => {
    const isNewState = previousState.current !== state;
    previousState.current = state;

    if (!isNewState || !successStatuses.includes(state.status)) {
      return;
    }

    toast.success(title, {
      description: state.message ?? description,
    });
  }, [description, state, successStatuses, title]);
}
