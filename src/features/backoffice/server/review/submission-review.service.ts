import "server-only";

import {
  submissionReviewQuerySchema,
  type SubmissionReviewQuery,
} from "../../schemas/submission-review-schema";
import type { BackofficeSubmissionReviewDto } from "../../types/submission-review.types";

export interface SubmissionReviewRepository {
  findByAccountId(
    query: SubmissionReviewQuery,
  ): Promise<BackofficeSubmissionReviewDto | null>;
}

export function createSubmissionReviewService({
  repository,
}: {
  repository: SubmissionReviewRepository;
}) {
  return {
    async load(input: SubmissionReviewQuery) {
      return repository.findByAccountId(
        submissionReviewQuerySchema.parse(input),
      );
    },
  };
}
