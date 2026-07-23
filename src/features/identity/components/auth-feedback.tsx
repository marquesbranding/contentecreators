import { CircleAlert, CircleCheck } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";

import type { AuthActionState } from "../types/auth.types";

export function AuthFeedback({ state }: { state: AuthActionState }) {
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
