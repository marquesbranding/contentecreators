"use client";

import { Check, CloudAlert, CloudUpload, LoaderCircle } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";

import type { useOnboardingAutosave } from "../hooks/use-onboarding-autosave";

type AutosaveStatus = ReturnType<typeof useOnboardingAutosave>["status"];

export function OnboardingAutosaveStatus({
  status,
}: {
  status: AutosaveStatus;
}) {
  const Icon =
    status.kind === "saving"
      ? LoaderCircle
      : status.kind === "saved"
        ? Check
        : status.kind === "conflict" || status.kind === "error"
          ? CloudAlert
          : CloudUpload;

  return (
    <div aria-live="polite" className="flex justify-end">
      <Badge className="gap-1.5" variant="outline">
        <Icon
          aria-hidden="true"
          className={status.kind === "saving" ? "animate-spin" : undefined}
        />
        {status.message}
      </Badge>
    </div>
  );
}
