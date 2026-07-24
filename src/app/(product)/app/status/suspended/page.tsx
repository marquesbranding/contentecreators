import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountStatusBoundary } from "@/features/moderation/server";

export const metadata: Metadata = {
  title: "Acesso suspenso",
};

export default function SuspendedAccountPage() {
  return (
    <AccountStatusBoundary
      renderApproved={() => redirect("/app/catalog")}
    />
  );
}
