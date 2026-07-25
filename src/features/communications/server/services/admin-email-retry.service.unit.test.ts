import { describe, expect, it, vi } from "vitest";

import { createAdminEmailRetryService } from "./admin-email-retry.service";

const command = {
  outboxId: "99999999-9999-4999-8999-999999999999",
  reason: "Reenvio autorizado após normalização do SMTP",
  requestId: "manual-retry-request",
};

describe("admin email retry service", () => {
  it("attempts the same scheduled outbox identity immediately", async () => {
    const attemptImmediately = vi.fn(async () => undefined);
    const scheduleRetry = vi.fn(async () => ({
      kind: "scheduled" as const,
      outboxId: command.outboxId,
    }));
    const service = createAdminEmailRetryService({
      attemptImmediately,
      scheduleRetry,
    });

    await expect(service.retry(command)).resolves.toEqual({
      delivery: "attempted",
      kind: "scheduled",
      outboxId: command.outboxId,
    });
    expect(scheduleRetry).toHaveBeenCalledWith(command);
    expect(attemptImmediately).toHaveBeenCalledWith({
      outboxId: command.outboxId,
      requestId: "manual-retry-request:delivery",
    });
  });

  it("keeps the retry scheduled when immediate SMTP delivery fails", async () => {
    const service = createAdminEmailRetryService({
      attemptImmediately: vi.fn(async () => {
        throw new Error("SMTP unavailable");
      }),
      scheduleRetry: vi.fn(async () => ({
        kind: "scheduled" as const,
        outboxId: command.outboxId,
      })),
    });

    await expect(service.retry(command)).resolves.toEqual({
      delivery: "pending",
      kind: "scheduled",
      outboxId: command.outboxId,
    });
  });

  it.each([
    "already_scheduled",
    "already_sent",
    "not_found",
    "not_retryable",
  ] as const)(
    "does not attempt a duplicate delivery for %s",
    async (resultKind) => {
      const attemptImmediately = vi.fn();
      const service = createAdminEmailRetryService({
        attemptImmediately,
        scheduleRetry: vi.fn(async () => ({ kind: resultKind })),
      });

      await expect(service.retry(command)).resolves.toEqual({
        kind: resultKind,
      });
      expect(attemptImmediately).not.toHaveBeenCalled();
    },
  );
});
