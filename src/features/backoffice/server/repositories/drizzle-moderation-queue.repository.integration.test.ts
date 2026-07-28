import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { createVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createModerationQueueService } from "../services/moderation-queue.service";
import { listModerationQueue } from "./drizzle-moderation-queue.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const client = createDatabaseClient(databaseUrl);
const adminAuthUserId = "10000000-0000-4000-8000-000000000001";

describeLocalStack("Drizzle moderation queue repository", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("paginates role-specific results with search, counts and safe DTOs", async () => {
    const service = createModerationQueueService({
      list: listModerationQueue,
      runVerifiedAccountTransaction: createVerifiedAccountTransactionRunner({
        database: client.database,
        resolveVerifiedAuthUserId: async () => adminAuthUserId,
      }),
    });

    const result = await service.list(
      {
        order: "PENDING_FIRST",
        page: 1,
        pageSize: 1,
        role: "COMPANY",
        search: "Empresa Dois",
        status: "PENDING_REVIEW",
      },
      `queue-integration-${crypto.randomUUID()}`,
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        accountId: "c0000000-0000-4000-8000-000000000002",
        completionPercentage: 80,
        displayName: "Empresa Dois",
        role: "COMPANY",
        status: "PENDING_REVIEW",
      }),
    ]);
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    });
    expect(result.counts.byRole).toEqual({
      COMPANY: 2,
      INFLUENCER: 2,
    });
    expect(result.counts.byStatus).toMatchObject({
      CHANGES_REQUESTED: 1,
      PENDING_REVIEW: 1,
    });
    expect(JSON.stringify(result)).not.toContain("authUserId");
    expect(JSON.stringify(result)).not.toContain("operationalEmail");
    expect(JSON.stringify(result)).not.toContain("cnpj");
  });

  it("keeps deterministic pending-first ordering across pages", async () => {
    const service = createModerationQueueService({
      list: listModerationQueue,
      runVerifiedAccountTransaction: createVerifiedAccountTransactionRunner({
        database: client.database,
        resolveVerifiedAuthUserId: async () => adminAuthUserId,
      }),
    });
    const sharedFilters = {
      order: "PENDING_FIRST" as const,
      pageSize: 1,
      role: "INFLUENCER" as const,
      search: "",
      status: undefined,
    };
    const first = await service.list(
      { ...sharedFilters, page: 1 },
      `queue-page-one-${crypto.randomUUID()}`,
    );
    const second = await service.list(
      { ...sharedFilters, page: 2 },
      `queue-page-two-${crypto.randomUUID()}`,
    );

    expect(first.items[0]?.status).toBe("PENDING_REVIEW");
    expect(second.items[0]?.status).toBe("CHANGES_REQUESTED");
    expect(first.items[0]?.accountId).not.toBe(second.items[0]?.accountId);
  });
});
