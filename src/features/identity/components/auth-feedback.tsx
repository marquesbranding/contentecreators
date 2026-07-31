"use client";

import { CircleAlert, CircleCheck } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { useActionSuccessToast } from "@/shared/hooks/use-action-success-toast";

import type { AuthActionState } from "../types/auth.types";

const successfulAuthStatuses = ["success", "confirmation_required"] as const;

export function AuthFeedback({ state }: { state: AuthActionState }) {
  useActionSuccessToast(state, {
    successStatuses: successfulAuthStatuses,
    title:
      state.status === "confirmation_required"
        ? "Confira seu e-mail"
        : "Tudo certo!",
  });

  if (!state.message || state.status === "idle") {
    return null;
  }

  const isError = state.status === "error";

  return (
    <Alert
      aria-live="polite"
      className={isError ? undefined : "border-[#138a5b]/30 bg-[#138a5b]/5"}
      variant={isError ? "destructive" : "default"}
    >
      {isError ? (
        <CircleAlert aria-hidden="true" />
      ) : (
        <CircleCheck aria-hidden="true" className="text-[#138a5b]" />
      )}
      <AlertTitle>
        {isError ? "Não foi possível continuar" : "Tudo certo até aqui"}
      </AlertTitle>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
