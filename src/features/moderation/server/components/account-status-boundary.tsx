import "server-only";

import { redirect } from "next/navigation";

import { getAccountDestination } from "@/features/identity";
import {
  getServerCurrentAccount,
  signOutAction,
  type CurrentAccountDto,
} from "@/features/identity/server";

import { AnalysisPending } from "../../components/analysis-pending";
import { BlockedAccount } from "../../components/blocked-account";
import { SuspendedAccount } from "../../components/suspended-account";

export async function AccountStatusBoundary({
  renderApproved,
}: {
  renderApproved: (
    account: CurrentAccountDto,
  ) => Promise<React.ReactNode> | React.ReactNode;
}) {
  const account = await getServerCurrentAccount();

  if (!account) {
    redirect("/onboarding/role");
  }

  if (account.role === "ADMIN") {
    redirect("/backoffice");
  }

  if (
    account.status === "ONBOARDING" ||
    account.status === "CHANGES_REQUESTED"
  ) {
    redirect(getAccountDestination(account));
  }

  if (account.status === "PENDING_REVIEW") {
    return <AnalysisPending signOutAction={signOutAction} />;
  }

  if (account.status === "SUSPENDED") {
    return <SuspendedAccount signOutAction={signOutAction} />;
  }

  if (account.status === "BANNED") {
    return <BlockedAccount />;
  }

  return renderApproved(account);
}
