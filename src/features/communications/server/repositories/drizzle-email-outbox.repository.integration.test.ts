import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { type ApplicationTransaction, createDatabaseClient } from "@/db/client";
import { emailAttempts, emailOutbox } from "@/db/schema";
import { applyVerifiedAuditContext } from "@/features/audit/server";

import { createEmailOutboxProcessor } from "../services/email-outbox-processor.service";
import { createDrizzleEmailOutboxRepository } from "./drizzle-email-outbox.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const databaseClient = createDatabaseClient(databaseUrl);
const repository = createDrizzleEmailOutboxRepository({
  database: databaseClient.database,
  lockTimeoutMs: 60_000,
});
const createdOutboxIds: string[] = [];

function runWithTestAuditContext<T>(
  reason: string,
  work: (transaction: ApplicationTransaction) => Promise<T>,
) {
  return databaseClient.database.transaction(async (transaction) => {
    await applyVerifiedAuditContext(transaction, {
      actorAccountId: null,
      actorRole: null,
      actorType: "SYSTEM",
      reason,
      requestId: `outbox-integration:${randomUUID()}`,
      source: "SCRIPT",
    });

    return work(transaction);
  });
}

async function insertOutbox(input: {
  dueAt: Date;
  lockedAt?: Date;
  lockedBy?: string;
  maxAttempts?: number;
  status?: "FAILED" | "PENDING" | "PROCESSING";
}) {
  const item = await runWithTestAuditContext(
    "Create email outbox integration fixture",
    async (transaction) => {
      const [created] = await transaction
        .insert(emailOutbox)
        .values({
          dueAt: input.dueAt,
          idempotencyKey: `outbox-integration:${randomUUID()}`,
          lockedAt: input.lockedAt,
          lockedBy: input.lockedBy,
          maxAttempts: input.maxAttempts ?? 3,
          payload: { role: "INFLUENCER" },
          recipientEmail: "outbox-integration@example.test",
          status: input.status ?? "PENDING",
          template: "APPROVED",
        })
        .returning({ id: emailOutbox.id });

      return created;
    },
  );

  if (!item) {
    throw new Error("Email outbox integration fixture was not created.");
  }

  createdOutboxIds.push(item.id);

  return item.id;
}

describeLocalStack("Drizzle email outbox repository", () => {
  afterEach(async () => {
    if (createdOutboxIds.length === 0) {
      return;
    }

    const ids = createdOutboxIds.splice(0);
    await runWithTestAuditContext(
      "Remove email outbox integration fixtures",
      async (transaction) => {
        await transaction
          .delete(emailAttempts)
          .where(inArray(emailAttempts.outboxId, ids));
        await transaction
          .delete(emailOutbox)
          .where(inArray(emailOutbox.id, ids));
      },
    );
  });

  afterAll(async () => {
    await databaseClient.client.end({ timeout: 2 });
  });

  it("allows concurrent workers to deliver and record one message only once", async () => {
    const now = new Date("2026-07-25T12:00:00.000Z");
    const outboxId = await insertOutbox({ dueAt: now });
    const deliver = vi.fn(async () => ({
      kind: "sent" as const,
      providerMessageIdHash:
        "7945d3a562bd73595d39353c171c7dbda94846b3c18ef604d6c0aea5b9e46eba",
      responseCode: "250",
    }));
    const processorA = createEmailOutboxProcessor({
      deliveryPort: { deliver },
      now: () => now,
      repository,
    });
    const processorB = createEmailOutboxProcessor({
      deliveryPort: { deliver },
      now: () => now,
      repository,
    });

    const results = await Promise.all([
      processorA.processOne({ outboxId, workerId: "worker-a" }),
      processorB.processOne({ outboxId, workerId: "worker-b" }),
    ]);

    expect(results).toEqual(
      expect.arrayContaining([{ kind: "sent" }, { kind: "not_claimed" }]),
    );
    expect(deliver).toHaveBeenCalledOnce();

    const [persisted] = await databaseClient.database
      .select({
        attemptCount: emailOutbox.attemptCount,
        sentAt: emailOutbox.sentAt,
        status: emailOutbox.status,
      })
      .from(emailOutbox)
      .where(eq(emailOutbox.id, outboxId));
    const attempts = await databaseClient.database
      .select({ status: emailAttempts.status })
      .from(emailAttempts)
      .where(eq(emailAttempts.outboxId, outboxId));

    expect(persisted).toMatchObject({
      attemptCount: 1,
      status: "SENT",
    });
    expect(persisted?.sentAt).toEqual(now);
    expect(attempts).toEqual([{ status: "SENT" }]);
  });

  it("schedules bounded retries and reaches dead letter at the attempt limit", async () => {
    const firstAttemptAt = new Date("2026-07-25T13:00:00.000Z");
    const secondAttemptAt = new Date("2026-07-25T13:00:30.000Z");
    const outboxId = await insertOutbox({
      dueAt: firstAttemptAt,
      maxAttempts: 2,
    });
    let currentTime = firstAttemptAt;
    const processor = createEmailOutboxProcessor({
      deliveryPort: {
        deliver: vi.fn(async () => ({
          errorCategory: "SMTP_TRANSIENT",
          errorCode: "CONNECTION_TIMEOUT",
          kind: "failed" as const,
          retryable: true,
        })),
      },
      now: () => currentTime,
      repository,
    });

    await expect(
      processor.processOne({ outboxId, workerId: "retry-worker" }),
    ).resolves.toEqual({ kind: "failed" });

    currentTime = new Date(secondAttemptAt.getTime() - 1);
    await expect(
      processor.processOne({ outboxId, workerId: "retry-worker" }),
    ).resolves.toEqual({ kind: "not_claimed" });

    currentTime = secondAttemptAt;
    await expect(
      processor.processOne({ outboxId, workerId: "retry-worker" }),
    ).resolves.toEqual({ kind: "dead_letter" });

    const [persisted] = await databaseClient.database
      .select({
        attemptCount: emailOutbox.attemptCount,
        lastErrorCategory: emailOutbox.lastErrorCategory,
        lockedAt: emailOutbox.lockedAt,
        lockedBy: emailOutbox.lockedBy,
        status: emailOutbox.status,
      })
      .from(emailOutbox)
      .where(eq(emailOutbox.id, outboxId));
    const attempts = await databaseClient.database
      .select({
        attemptNumber: emailAttempts.attemptNumber,
        status: emailAttempts.status,
      })
      .from(emailAttempts)
      .where(eq(emailAttempts.outboxId, outboxId));

    expect(persisted).toEqual({
      attemptCount: 2,
      lastErrorCategory: "SMTP_TRANSIENT",
      lockedAt: null,
      lockedBy: null,
      status: "DEAD_LETTER",
    });
    expect(attempts).toEqual(
      expect.arrayContaining([
        { attemptNumber: 1, status: "FAILED" },
        { attemptNumber: 2, status: "FAILED" },
      ]),
    );
  });

  it("uses the claim version as a fence against duplicate success records", async () => {
    const now = new Date("2026-07-25T14:00:00.000Z");
    const outboxId = await insertOutbox({ dueAt: now });
    const [claim] = await repository.claimDue({
      limit: 1,
      now,
      outboxId,
      workerId: "fenced-worker",
    });

    if (!claim) {
      throw new Error("Email outbox fixture was not claimed.");
    }

    const completions = await Promise.all([
      repository.recordSuccess({
        claim,
        completedAt: now,
        providerMessageIdHash: null,
        responseCode: "250",
      }),
      repository.recordSuccess({
        claim,
        completedAt: now,
        providerMessageIdHash: null,
        responseCode: "250",
      }),
    ]);

    expect(completions).toEqual(
      expect.arrayContaining([{ kind: "recorded" }, { kind: "claim_lost" }]),
    );
    await expect(
      databaseClient.database
        .select({ id: emailAttempts.id })
        .from(emailAttempts)
        .where(
          and(
            eq(emailAttempts.outboxId, outboxId),
            eq(emailAttempts.status, "SENT"),
          ),
        ),
    ).resolves.toHaveLength(1);
  });

  it("recovers an expired processing lock without allowing the old claim to complete", async () => {
    const now = new Date("2026-07-25T15:00:00.000Z");
    const outboxId = await insertOutbox({
      dueAt: new Date(now.getTime() - 10 * 60_000),
      lockedAt: new Date(now.getTime() - 2 * 60_000),
      lockedBy: "stopped-worker",
      status: "PROCESSING",
    });

    const [reclaimed] = await repository.claimDue({
      limit: 1,
      now,
      outboxId,
      workerId: "recovery-worker",
    });

    expect(reclaimed).toMatchObject({
      attemptNumber: 1,
      id: outboxId,
      workerId: "recovery-worker",
    });
  });
});
