"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { getBrowserSupabaseClient } from "@/shared/lib/supabase/browser-client";

import { RecoveryLinkUnavailable } from "./recovery-link-unavailable";
import { ResetPasswordForm } from "./reset-password-form.client";

type RecoveryGateState = "invalid" | "pending" | "ready";

interface ResetPasswordRecoveryGateProps {
  code: string;
}

export function ResetPasswordRecoveryGate({
  code,
}: ResetPasswordRecoveryGateProps) {
  const [state, setState] = useState<RecoveryGateState>("pending");

  useEffect(() => {
    let isMounted = true;

    async function exchangeRecoveryCode() {
      const client = getBrowserSupabaseClient();
      const { error } = await client.auth.exchangeCodeForSession(code);

      if (!isMounted) {
        return;
      }

      if (error) {
        setState("invalid");
        return;
      }

      window.history.replaceState(null, "", "/reset-password");
      setState("ready");
    }

    void exchangeRecoveryCode();

    return () => {
      isMounted = false;
    };
  }, [code]);

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
