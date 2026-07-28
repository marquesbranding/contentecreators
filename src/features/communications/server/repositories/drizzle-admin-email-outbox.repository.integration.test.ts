import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { emailAttempts, emailOutbox } from "@/db/schema";
import { createVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createAdminEmailOutboxService } from "../services/admin-email-outbox.service";
import {
  findAdminEmailOutboxDetail,
  listAdminEmailOutbox,
} from "./drizzle-admin-email-outbox.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const client = createDatabaseClient(databaseUrl);
const seedAdmin = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000001",
};

describeLocalStack("Drizzle admin email outbox read repository", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("paginates and details pending/failed messages without leaking retry data", async () => {
    const terminalId = crypto.randomUUID();
    const pendingId = crypto.randomUUID();
    const ids = [terminalId, pendingId];

    try {
      await client.database.insert(emailOutbox).values([
        {
          accountId: seedAdmin.accountId,
          attemptCount: 5,
          dueAt: new Date("2026-07-28T13:00:00.000Z"),
          id: terminalId,
          idempotencyKey: `outbox-view-terminal:${terminalId}`,
          lastErrorCategory: "TIMEOUT",
          lastErrorCode: "PRIVATE_PROVIDER_CODE",
          maxAttempts: 5,
          payload: {
            body: "Conteúdo que não pode sair do repositório",
            token: "segredo-operacional",
          },
          recipientEmail: "destinatario-secreto@example.test",
          status: "DEAD_LETTER",
          template: "APPROVED",
        },
        {
          accountId: seedAdmin.accountId,
          dueAt: new Date("2026-07-28T14:00:00.000Z"),
          id: pendingId,
          idempotencyKey: `outbox-view-pending:${pendingId}`,
          payload: {},
          recipientEmail: "outro-destinatario@example.test",
          status: "PENDING",
          template: "CHANGES_REQUESTED",
        },
      ]);
      await client.database.insert(emailAttempts).values({
        attemptNumber: 5,
        attemptedAt: new Date("2026-07-28T12:30:00.000Z"),
        errorCategory: "TIMEOUT",
        errorCode: "PRIVATE_PROVIDER_CODE",
        latencyMs: 8_000,
        outboxId: terminalId,
        providerMessageIdHash: "a".repeat(64),
        responseCode: "451",
        status: "FAILED",
      });

      const service = createAdminEmailOutboxService({
        findDetail: findAdminEmailOutboxDetail,
        list: listAdminEmailOutbox,
        runVerifiedAccountTransaction: createVerifiedAccountTransactionRunner({
          database: client.database,
          resolveVerifiedAuthUserId: async () => seedAdmin.authUserId,
        }),
      });
      const list = await service.list(
        {
          order: "ATTENTION_FIRST",
          page: 1,
          pageSize: 1,
          status: "DEAD_LETTER",
          template: "APPROVED",
        },
        `email-list-${crypto.randomUUID()}`,
      );
      const detail = await service.findDetail(
        terminalId,
        `email-detail-${crypto.randomUUID()}`,
      );

      expect(list.items).toEqual([
        expect.objectContaining({
          id: terminalId,
          recipientReference: "Conta 00000001",
          retry: { eligible: true, reason: "ELIGIBLE" },
          status: "DEAD_LETTER",
          template: "APPROVED",
        }),
      ]);
      expect(list.pagination).toEqual({
        page: 1,
        pageSize: 1,
        totalItems: 1,
        totalPages: 1,
      });
      expect(detail?.attempts).toEqual([
        expect.objectContaining({
          attemptNumber: 5,
          outcome: "TIMEOUT_FAILURE",
          status: "FAILED",
        }),
      ]);

      const serialized = JSON.stringify({ detail, list });
      for (const forbidden of [
        "destinatario-secreto@example.test",
        "outro-destinatario@example.test",
        "Conteúdo que não pode sair",
        "segredo-operacional",
        "PRIVATE_PROVIDER_CODE",
        "providerMessageIdHash",
        "responseCode",
        "idempotencyKey",
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
    } finally {
      await client.database
        .delete(emailAttempts)
        .where(inArray(emailAttempts.outboxId, ids));
      await client.database
        .delete(emailOutbox)
        .where(inArray(emailOutbox.id, ids));
    }
  });
});
