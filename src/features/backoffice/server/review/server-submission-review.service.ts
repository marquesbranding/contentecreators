import "server-only";

import { createDrizzleSubmissionReviewRepository } from "./drizzle-submission-review.repository";
import { createSubmissionReviewService } from "./submission-review.service";
import { createServerVerifiedAccountTransactionRunner } from "@/features/identity/server";

export async function createServerSubmissionReviewService() {
  return createSubmissionReviewService({
    repository: createDrizzleSubmissionReviewRepository({
      runVerifiedTransaction:
        await createServerVerifiedAccountTransactionRunner(),
    }),
  });
}
