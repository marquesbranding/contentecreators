import { z } from "zod";

export const submissionReviewQuerySchema = z.object({
  accountId: z.uuid(),
  requestId: z.string().trim().min(8).max(128),
});

export type SubmissionReviewQuery = z.infer<typeof submissionReviewQuerySchema>;
