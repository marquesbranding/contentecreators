import { notFound } from "next/navigation";

import {
  ModerationActionPanel,
  SubmissionReview,
  submissionReviewQuerySchema,
  type ModerationServerActions,
} from "@/features/backoffice";
import { loadBackofficeSubmissionReview } from "@/features/backoffice/server";
import {
  approveAccountAction,
  archiveAccountAction,
  banAccountAction,
  requestAccountChangesAction,
  restoreAccountAction,
  suspendAccountAction,
  unbanAccountAction,
} from "@/features/moderation/server";

const moderationActions = {
  APPROVE: approveAccountAction,
  ARCHIVE: archiveAccountAction,
  BAN: banAccountAction,
  REQUEST_CHANGES: requestAccountChangesAction,
  RESTORE: restoreAccountAction,
  SUSPEND: suspendAccountAction,
  UNBAN: unbanAccountAction,
} satisfies ModerationServerActions;

export default async function BackofficeSubmissionReviewPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const parsedParams = submissionReviewQuerySchema.safeParse({
    accountId: (await params).accountId,
    requestId: crypto.randomUUID(),
  });

  if (!parsedParams.success) {
    notFound();
  }

  const review = await loadBackofficeSubmissionReview(
    parsedParams.data.accountId,
  );

  if (!review) {
    notFound();
  }

  const displayName =
    review.role === "INFLUENCER"
      ? review.profile.displayName
      : review.profile.tradeName;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <SubmissionReview review={review} />
      <div className="xl:sticky xl:top-24">
        <ModerationActionPanel
          accountId={review.account.id}
          accountVersion={review.account.version}
          actions={moderationActions}
          displayName={displayName}
          profileVersion={review.profile.version}
          status={review.account.status}
        />
      </div>
    </div>
  );
}
