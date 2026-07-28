import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { createVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleSubmissionReviewRepository } from "./drizzle-submission-review.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const adminAuthUserId = "10000000-0000-4000-8000-000000000001";
const creatorAuthUserId = "20000000-0000-4000-8000-000000000004";
const creatorAccountId = "b0000000-0000-4000-8000-000000000002";
const companyAccountId = "c0000000-0000-4000-8000-000000000002";
const drizzleClient = createDatabaseClient(databaseUrl);

function createRepository(authUserId: string) {
  return createDrizzleSubmissionReviewRepository({
    runVerifiedTransaction: createVerifiedAccountTransactionRunner({
      database: drizzleClient.database,
      resolveVerifiedAuthUserId: async () => authUserId,
    }),
  });
}

describeLocalStack("Drizzle submission review repository", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it.each([
    {
      accountId: creatorAccountId,
      role: "INFLUENCER",
    },
    {
      accountId: companyAccountId,
      role: "COMPANY",
    },
  ] as const)(
    "returns the full safe $role review DTO to a freshly verified admin",
    async ({ accountId, role }) => {
      const result = await createRepository(adminAuthUserId).findByAccountId({
        accountId,
        requestId: `review-integration-${role.toLowerCase()}`,
      });

      expect(result).toMatchObject({
        account: {
          completion: {
            percentage: expect.any(Number),
            version: expect.any(Number),
          },
          id: accountId,
          role,
          status: "PENDING_REVIEW",
          version: expect.any(Number),
        },
        moderation: {
          caseVersion: expect.any(Number),
          currentSubmissionSequence: expect.any(Number),
          history: expect.any(Array),
        },
        role,
        socialProfiles: expect.any(Array),
      });
      expect(JSON.stringify(result)).not.toMatch(
        /authUserId|objectPath|networkKeyHash|userAgentHash|signedUrl|token/i,
      );

      if (result?.role === "COMPANY") {
        expect(result).toMatchObject({
          cnpjAssistance: {
            source: "USER_PROVIDED_EDITABLE_DATA",
          },
          profile: {
            cnpj: expect.stringMatching(/^\d{14}$/),
            locations: expect.arrayContaining([
              expect.objectContaining({ isPrimary: true }),
            ]),
          },
        });
      } else {
        expect(result).toMatchObject({
          profile: {
            creatorType: "INFLUENCER",
            niches: expect.any(Array),
            selfReportedMetrics: expect.any(Array),
          },
        });
      }
    },
  );

  it("denies a direct review read when the verified identity is not an admin", async () => {
    await expect(
      createRepository(creatorAuthUserId).findByAccountId({
        accountId: companyAccountId,
        requestId: "review-integration-revoked-admin",
      }),
    ).rejects.toMatchObject({
      code: "ADMIN_REQUIRED",
    });
  });
});
