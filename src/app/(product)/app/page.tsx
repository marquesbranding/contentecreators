import { redirect } from "next/navigation";

import { AccountStatusBoundary } from "@/features/moderation/server";

export default function ApplicationEntryPage() {
  return (
    <AccountStatusBoundary renderApproved={() => redirect("/app/catalog")} />
  );
}
