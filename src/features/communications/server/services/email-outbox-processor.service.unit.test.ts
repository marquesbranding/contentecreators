import { describe, expect, it, vi } from "vitest";

import type {
  ClaimedEmailOutboxItem,
  OutboxDeliveryPort,
} from "../../types/outbox-processing.types";
import {
  createEmailOutboxProcessor,
  type EmailOutboxRepository,
} from "./email-outbox-processor.service";

const now = new Date("2026-07-25T12:00:00.000Z");
const claim: ClaimedEmailOutboxItem = {
  attemptNumber: 1,
  claimVersion: 2,
  id: "e0000000-0000-4000-8000-000000000001",
  idempotencyKey: "moderation-email:approval-1",
  maxAttempts: 3,
  payload: { role: "INFLUENCER" },
  recipientEmail: "synthetic@example.test",
  template: "APPROVED",
  workerId: "worker-a",
};

function createDependencies() {
  return {
    deliveryPort: {
      deliver: vi.fn<OutboxDeliveryPort["deliver"]>(async () => ({
        kind: "sent",
        providerMessageIdHash:
          "7945D3A562BD73595D39353C171C7DBDA94846B3C18EF604D6C0AEA5B9E46EBA",
        responseCode: "250",
      })),
    },
    now: vi.fn(() => now),
    repository: {
      claimDue: vi.fn<EmailOutboxRepository["claimDue"]>(async () => [claim]),
      recordFailure: vi.fn<EmailOutboxRepository["recordFailure"]>(
        async () => ({ kind: "recorded" }),
      ),
      recordSuccess: vi.fn<EmailOutboxRepository["recordSuccess"]>(
        async () => ({ kind: "recorded" }),
      ),
    },
  };
}

describe("email outbox processor", () => {
  it("claims due work, sends through the injected port and records one safe success", async () => {
    const dependencies = createDependencies();
    const processor = createEmailOutboxProcessor(dependencies);

    await expect(
      processor.processDue({ limit: 10, workerId: "worker-a" }),
    ).resolves.toEqual({
      claimLost: 0,
      claimed: 1,
      deadLetter: 0,
      failed: 0,
      sent: 1,
    });

    expect(dependencies.repository.claimDue).toHaveBeenCalledWith({
      limit: 10,
      now,
      outboxId: null,
      workerId: "worker-a",
    });
    expect(dependencies.deliveryPort.deliver).toHaveBeenCalledWith({
      idempotencyKey: claim.idempotencyKey,
      outboxId: claim.id,
      payload: claim.payload,
      recipientEmail: claim.recipientEmail,
      template: claim.template,
    });
    expect(dependencies.repository.recordSuccess).toHaveBeenCalledWith({
      claim,
      completedAt: now,
      providerMessageIdHash:
        "7945d3a562bd73595d39353c171c7dbda94846b3c18ef604d6c0aea5b9e46eba",
      responseCode: "250",
    });
  });

  it("records a retry with bounded backoff and no raw thrown error metadata", async () => {
    const dependencies = createDependencies();
    dependencies.deliveryPort.deliver.mockRejectedValueOnce(
      new Error("smtp refused synthetic@example.test with secret"),
    );
    const processor = createEmailOutboxProcessor(dependencies);

    await expect(
      processor.processDue({ limit: 1, workerId: "worker-a" }),
    ).resolves.toEqual({
      claimLost: 0,
      claimed: 1,
      deadLetter: 0,
      failed: 1,
      sent: 0,
    });

    expect(dependencies.repository.recordFailure).toHaveBeenCalledWith({
      claim,
      completedAt: now,
      errorCategory: "UNEXPECTED",
      errorCode: null,
      nextDueAt: new Date("2026-07-25T12:00:30.000Z"),
      status: "FAILED",
    });
  });

  it("moves a non-retryable delivery result directly to dead letter", async () => {
    const dependencies = createDependencies();
    dependencies.deliveryPort.deliver.mockResolvedValueOnce({
      errorCategory: "SMTP_CONFIGURATION",
      errorCode: "AUTH_INVALID_CREDENTIALS",
      kind: "failed",
      retryable: false,
    });
    const processor = createEmailOutboxProcessor(dependencies);

    await expect(
      processor.processDue({ limit: 1, workerId: "worker-a" }),
    ).resolves.toEqual({
      claimLost: 0,
      claimed: 1,
      deadLetter: 1,
      failed: 0,
      sent: 0,
    });

    expect(dependencies.repository.recordFailure).toHaveBeenCalledWith({
      claim,
      completedAt: now,
      errorCategory: "SMTP_CONFIGURATION",
      errorCode: "AUTH_INVALID_CREDENTIALS",
      nextDueAt: null,
      status: "DEAD_LETTER",
    });
  });

  it("reports a lost claim without creating a second successful record", async () => {
    const dependencies = createDependencies();
    dependencies.repository.recordSuccess.mockResolvedValueOnce({
      kind: "claim_lost",
    });
    const processor = createEmailOutboxProcessor(dependencies);

    await expect(
      processor.processOne({
        outboxId: claim.id,
        workerId: "worker-a",
      }),
    ).resolves.toEqual({
      kind: "claim_lost",
    });

    expect(dependencies.repository.claimDue).toHaveBeenCalledWith({
      limit: 1,
      now,
      outboxId: claim.id,
      workerId: "worker-a",
    });
  });

  it("does not send when no due item can be claimed", async () => {
    const dependencies = createDependencies();
    dependencies.repository.claimDue.mockResolvedValueOnce([]);
    const processor = createEmailOutboxProcessor(dependencies);

    await expect(
      processor.processOne({
        outboxId: claim.id,
        workerId: "worker-a",
      }),
    ).resolves.toEqual({
      kind: "not_claimed",
    });

    expect(dependencies.deliveryPort.deliver).not.toHaveBeenCalled();
  });
});
