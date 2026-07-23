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

export default async function AnalysisStatusPage() {
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

  return <AnalysisPending signOutAction={signOutAction} />;
}
