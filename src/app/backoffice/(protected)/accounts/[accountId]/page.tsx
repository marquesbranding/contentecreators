import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccountDetail } from "@/features/backoffice";
import { loadBackofficeAccountDetail } from "@/features/backoffice/server";

export const metadata: Metadata = {
  title: "Detalhes da conta",
};

export default async function BackofficeAccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      accountId,
    )
  ) {
    notFound();
  }

  const detail = await loadBackofficeAccountDetail(accountId);

  if (!detail) {
    notFound();
  }

  return <AccountDetail detail={detail} />;
}
