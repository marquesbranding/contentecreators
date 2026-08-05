"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { getBrowserSupabaseClient } from "@/shared/lib/supabase/browser-client";

import { RecoveryLinkUnavailable } from "./recovery-link-unavailable";
import { ResetPasswordForm } from "./reset-password-form.client";

type RecoveryGateState = "invalid" | "pending" | "ready";

interface ResetPasswordRecoveryGateProps {
  code?: string;
  tokenHash?: string;
  type?: string;
}

export function ResetPasswordRecoveryGate({
  code,
  tokenHash,
  type,
}: ResetPasswordRecoveryGateProps) {
  const [state, setState] = useState<RecoveryGateState>("pending");

  useEffect(() => {
    let isMounted = true;

    async function validateRecoveryAccess() {
      const client = getBrowserSupabaseClient();
      const hasRecoveryTokenHash = Boolean(tokenHash && type === "recovery");
      const result = code
        ? await client.auth.exchangeCodeForSession(code)
        : hasRecoveryTokenHash
          ? await client.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery",
            })
          : await client.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (result.error || !result.data.session) {
        setState("invalid");
        return;
      }

      window.history.replaceState(null, "", "/reset-password");
      setState("ready");
    }

    void validateRecoveryAccess();

    return () => {
      isMounted = false;
    };
  }, [code, tokenHash, type]);

  if (state === "invalid") {
    return <RecoveryLinkUnavailable />;
  }

  if (state === "ready") {
    return <ResetPasswordForm />;
  }

  return (
    <div
      aria-live="polite"
      className="border-border bg-muted/35 text-muted-foreground flex items-center gap-3 rounded-2xl border px-4 py-4 text-sm"
      role="status"
    >
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
      Validando link de recuperação...
    </div>
  );
}
