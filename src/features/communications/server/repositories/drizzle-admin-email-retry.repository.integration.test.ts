import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { auditRevisions, emailOutbox } from "@/db/schema";
import { createVerifiedAccountTransactionRunner } from "@/features/identity/server";

import { createDrizzleAdminEmailRetryRepository } from "./drizzle-admin-email-retry.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const client = createDatabaseClient(databaseUrl);
const seedAdmin = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000001",
};

describeLocalStack("Drizzle admin email retry repository", () => {
  afterAll(async () => {
    await client.client.end({ timeout: 2 });
  });

  it("authorizes, audits and schedules only one extra terminal attempt", async () => {
    const outboxId = crypto.randomUUID();
    const requestId = `admin-email-retry-${crypto.randomUUID()}`;
    const command = {
      outboxId,
      reason: "Reenvio autorizado após correção operacional do SMTP",
      requestId,
    };

    try {
      await client.database.insert(emailOutbox).values({
        attemptCount: 5,
        id: outboxId,
        idempotencyKey: `admin-retry-test:${outboxId}`,
        maxAttempts: 5,
        payload: {},
        recipientEmail: `admin-retry-${outboxId}@contentecreators.test`,
        status: "DEAD_LETTER",
        template: "APPROVED",
      });

      const repository = createDrizzleAdminEmailRetryRepository({
        runVerifiedTransaction: createVerifiedAccountTransactionRunner({
          database: client.database,
          resolveVerifiedAuthUserId: async () => seedAdmin.authUserId,
        }),
      });

      await expect(repository.scheduleRetry(command)).resolves.toEqual({
        kind: "scheduled",
        outboxId,
      });
      await expect(repository.scheduleRetry(command)).resolves.toEqual({
        kind: "already_scheduled",
      });

      const [outbox] = await client.database
        .select({
          attemptCount: emailOutbox.attemptCount,
          maxAttempts: emailOutbox.maxAttempts,
          status: emailOutbox.status,
        })
        .from(emailOutbox)
        .where(eq(emailOutbox.id, outboxId))
        .limit(1);
      const auditRows = await client.database
        .select({
          actorAccountId: auditRevisions.actorAccountId,
          actorRole: auditRevisions.actorRole,
          reason: auditRevisions.reason,
          requestId: auditRevisions.requestId,
          source: auditRevisions.source,
        })
        .from(auditRevisions)
        .where(
          and(
            eq(auditRevisions.entityTable, "email_outbox"),
            eq(auditRevisions.entityId, outboxId),
            eq(auditRevisions.requestId, requestId),
          ),
        );

      expect(outbox).toEqual({
        attemptCount: 5,
        maxAttempts: 6,
        status: "PENDING",
      });
      expect(auditRows).toEqual([
        {
          actorAccountId: seedAdmin.accountId,
          actorRole: "ADMIN",
          reason: command.reason,
          requestId,
          source: "BACKOFFICE",
        },
      ]);
    } finally {
      await client.database
        .delete(emailOutbox)
        .where(eq(emailOutbox.id, outboxId));
    }
  });
});
