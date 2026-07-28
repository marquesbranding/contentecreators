import "server-only";

import { createServerSubmissionReviewService } from "./server-submission-review.service";

export async function loadBackofficeSubmissionReview(accountId: string) {
  const service = await createServerSubmissionReviewService();

  return service.load({
    accountId,
    requestId: crypto.randomUUID(),
  });
}
