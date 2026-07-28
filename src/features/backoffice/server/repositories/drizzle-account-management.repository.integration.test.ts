import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { createVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleAccountDetailRepository } from "../details/drizzle-account-detail.repository";
import { createAccountManagementService } from "../services/account-management.service";
import { listManagedAccounts } from "./drizzle-account-management.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const adminAuthUserId = "10000000-0000-4000-8000-000000000001";
const creatorAuthUserId = "20000000-0000-4000-8000-000000000004";
const companyAccountId = "c0000000-0000-4000-8000-000000000002";
const client = createDatabaseClient(databaseUrl);

function createRunner(authUserId: string) {
  return createVerifiedAccountTransactionRunner({
    database: client.database,
    resolveVerifiedAuthUserId: async () => authUserId,
  });
}

describeLocalStack("Drizzle account management repositories", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("searches and paginates safe account summaries as an admin", async () => {
    const service = createAccountManagementService({
      list: listManagedAccounts,
      runVerifiedAccountTransaction: createRunner(adminAuthUserId),
    });
    const result = await service.list(
      {
        archive: "ACTIVE",
        order: "NAME_ASC",
        page: 1,
        pageSize: 1,
        role: "COMPANY",
        search: "Empresa Dois",
        status: "PENDING_REVIEW",
      },
      `account-list-${crypto.randomUUID()}`,
    );

    expect(result).toMatchObject({
      items: [
        {
          accountId: companyAccountId,
          archivedAt: null,
          completionPercentage: 80,
          displayName: "Empresa Dois",
          operationalEmail: "company-pending@contentecreators.test",
          role: "COMPANY",
          status: "PENDING_REVIEW",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 1,
        totalItems: 1,
        totalPages: 1,
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /authUserId|objectPath|bucketName|networkKeyHash|userAgentHash|signedUrl/i,
    );
  });

  it("loads an authorized full account detail without infrastructure fields", async () => {
    const repository = createDrizzleAccountDetailRepository({
      runVerifiedTransaction: createRunner(adminAuthUserId),
    });
    const result = await repository.findByAccountId({
      accountId: companyAccountId,
      requestId: `account-detail-${crypto.randomUUID()}`,
    });

    expect(result).toMatchObject({
      account: {
        completion: { percentage: 80, version: expect.any(Number) },
        id: companyAccountId,
        role: "COMPANY",
        status: "PENDING_REVIEW",
      },
      consents: expect.any(Array),
      media: expect.any(Array),
      moderation: {
        currentSubmissionSequence: expect.any(Number),
        history: expect.any(Array),
      },
      profile: {
        editableProfile: {
          cnpj: "12345678000276",
          tradeName: "Empresa Dois",
          version: expect.any(Number),
        },
        kind: "COMPANY",
      },
      socialProfiles: expect.any(Array),
    });
    expect(JSON.stringify(result)).not.toMatch(
      /authUserId|objectPath|bucketName|networkKeyHash|userAgentHash|signedUrl/i,
    );
  });

  it("denies account detail reads from a normal approved account", async () => {
    const repository = createDrizzleAccountDetailRepository({
      runVerifiedTransaction: createRunner(creatorAuthUserId),
    });

    await expect(
      repository.findByAccountId({
        accountId: companyAccountId,
        requestId: `account-denied-${crypto.randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: "ROLE_FORBIDDEN" });
  });
});
