import { describe, expect, it, vi } from "vitest";

import { createDrizzleSubmissionReviewRepository } from "./drizzle-submission-review.repository";

describe("drizzle submission review repository authorization", () => {
  it.each([
    { role: "INFLUENCER" as const, status: "APPROVED" as const },
    { role: "ADMIN" as const, status: "SUSPENDED" as const },
  ])(
    "denies a direct read for $role/$status before selecting target data",
    async ({ role, status }) => {
      const transaction = {
        select: vi.fn(),
      };
      const runVerifiedTransaction = vi.fn(
        async (
          _input: unknown,
          work: (
            transaction: never,
            actor: {
              accountId: string;
              authUserId: string;
              role: typeof role;
              status: typeof status;
            },
          ) => Promise<unknown>,
        ) =>
          work(transaction as never, {
            accountId: "a0000000-0000-4000-8000-000000000001",
            authUserId: "10000000-0000-4000-8000-000000000001",
            role,
            status,
          }),
      );
      const repository = createDrizzleSubmissionReviewRepository({
        runVerifiedTransaction: runVerifiedTransaction as never,
      });

      await expect(
        repository.findByAccountId({
          accountId: "b0000000-0000-4000-8000-000000000004",
          requestId: "review-request-id",
        }),
      ).rejects.toMatchObject({
        code: "ADMIN_REQUIRED",
        name: "SubmissionReviewAccessError",
      });
      expect(transaction.select).not.toHaveBeenCalled();
    },
  );
});
