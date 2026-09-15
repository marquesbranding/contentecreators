import { redirect } from "next/navigation";
import { createServerRoleSelectionService } from "@/features/identity/server";
export default async function LegacyRolePage() {
  const decision = await (
    await createServerRoleSelectionService()
  ).getEntryDecision();
  redirect(
    decision.kind === "ready" ? "/onboarding/account" : decision.destination,
  );
}
