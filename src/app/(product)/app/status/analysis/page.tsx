import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  createServerRoleSelectionService,
  signOutAction,
} from "@/features/identity/server";
import { AnalysisPending } from "@/features/moderation";

export const metadata: Metadata = {
  title: "Cadastro em análise",
};

interface AnalysisStatusPageProps {
  searchParams: Promise<{
    confirmed?: string | string[];
  }>;
}

export default async function AnalysisStatusPage({
  searchParams,
}: AnalysisStatusPageProps) {
  const parameters = await searchParams;
  const confirmedValue = Array.isArray(parameters.confirmed)
    ? parameters.confirmed[0]
    : parameters.confirmed;
  const service = await createServerRoleSelectionService();
  const decision = await service.getEntryDecision();

  if (
    decision.kind === "ready" ||
    decision.destination !== "/app/status/analysis"
  ) {
    redirect(
      decision.kind === "ready" ? "/onboarding/role" : decision.destination,
    );
  }

  return (
    <AnalysisPending
      emailConfirmed={confirmedValue === "1"}
      signOutAction={signOutAction}
    />
  );
}
