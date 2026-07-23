import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RoleSelectionForm, RoleSelectionShell } from "@/features/identity";
import {
  createServerRoleSelectionService,
  selectRoleAction,
  signOutAction,
} from "@/features/identity/server";

export const metadata: Metadata = {
  title: "Escolher tipo de perfil",
  description: "Escolha como você vai usar a Contente Creators.",
};

export default async function RoleSelectionPage() {
  const service = await createServerRoleSelectionService();
  const decision = await service.getEntryDecision();

  if (decision.kind === "redirect") {
    redirect(decision.destination);
  }

  return (
    <RoleSelectionShell signOutAction={signOutAction}>
      <RoleSelectionForm action={selectRoleAction} />
    </RoleSelectionShell>
  );
}
