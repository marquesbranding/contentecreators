import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountDetail } from "@/features/backoffice";
import { loadBackofficeAccountDetail } from "@/features/backoffice/server";
import { buttonVariants } from "@/shared/components/ui/button";

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

  const editableProfile = detail.profile?.editableProfile;
  const canEditProfile =
    editableProfile &&
    !detail.account.archivedAt &&
    detail.account.status !== "BANNED";

  return (
    <AccountDetail
      detail={detail}
      profileActions={
        canEditProfile ? (
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={`/backoffice/accounts/${accountId}/edit`}
          >
            <Pencil aria-hidden="true" />
            Editar perfil
          </Link>
        ) : null
      }
    />
  );
}
