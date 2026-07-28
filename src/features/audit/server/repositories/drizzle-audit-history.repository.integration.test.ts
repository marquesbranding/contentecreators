import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { createVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createAuditHistoryService } from "../services/audit-history.service";
import { listAuditHistory } from "./drizzle-audit-history.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const client = createDatabaseClient(databaseUrl);
const adminAuthUserId = "10000000-0000-4000-8000-000000000001";
const approvedCreatorId = "b0000000-0000-4000-8000-000000000004";

describeLocalStack("Drizzle audit history repository", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("filters seeded immutable revisions and returns redacted bounded DTOs", async () => {
    const service = createAuditHistoryService({
      list: listAuditHistory,
      runVerifiedAccountTransaction: createVerifiedAccountTransactionRunner({
        database: client.database,
        resolveVerifiedAuthUserId: async () => adminAuthUserId,
      }),
    });

    const result = await service.list(
      {
        action: "UPDATE",
        actorAccountId: "a0000000-0000-4000-8000-000000000001",
        actorType: "ADMIN",
        entity: "accounts",
        page: 1,
        pageSize: 1,
        periodFrom: "2020-01-01",
        periodTo: "2030-12-31",
        record: approvedCreatorId,
        source: "SCRIPT",
      },
      `audit-history-${crypto.randomUUID()}`,
    );

    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        action: "UPDATE",
        actor: expect.objectContaining({
          accountId: "a0000000-0000-4000-8000-000000000001",
          actorType: "ADMIN",
          role: "ADMIN",
        }),
        entity: "accounts",
        record: approvedCreatorId,
        source: "SCRIPT",
      }),
    ]);
    expect(result.items[0]?.changes).toEqual([
      expect.objectContaining({ field: "status" }),
    ]);
    expect(JSON.stringify(result)).not.toContain("operational_email");
    expect(JSON.stringify(result)).not.toContain(
      "creator-approved@contentecreators.test",
    );
    expect(result.items[0]).not.toHaveProperty("beforeState");
    expect(result.items[0]).not.toHaveProperty("afterState");
  });
});
