import { describe, expect, it, vi } from "vitest";

import { runWithPostCommitEmailDelivery } from "./post-commit-email-delivery.service";

describe("post-commit email delivery", () => {
  it("attempts delivery only after the business event has committed", async () => {
    const order: string[] = [];
    const commitBusinessEvent = vi.fn(async () => {
      order.push("committed");

      return {
        businessResult: { accountStatus: "APPROVED" },
        outboxId: "e0000000-0000-4000-8000-000000000001",
      };
    });
    const processOne = vi.fn(async () => {
      order.push("delivery");

      return { kind: "sent" as const };
    });

    await expect(
      runWithPostCommitEmailDelivery({
        commitBusinessEvent,
        processOne,
        workerId: "immediate-worker",
      }),
    ).resolves.toEqual({
      businessResult: { accountStatus: "APPROVED" },
      emailDelivery: "sent",
    });

    expect(order).toEqual(["committed", "delivery"]);
  });

  it("preserves the committed result when immediate delivery fails", async () => {
    const committedResult = { accountStatus: "APPROVED" };

    await expect(
      runWithPostCommitEmailDelivery({
        commitBusinessEvent: async () => ({
          businessResult: committedResult,
          outboxId: "e0000000-0000-4000-8000-000000000001",
        }),
        processOne: vi.fn(async () => {
          throw new Error("Database or SMTP became unavailable.");
        }),
        workerId: "immediate-worker",
      }),
    ).resolves.toEqual({
      businessResult: committedResult,
      emailDelivery: "deferred",
    });
  });

  it("does not attempt email or swallow a failed business transaction", async () => {
    const businessError = new Error("Business transaction failed.");
    const processOne = vi.fn();

    await expect(
      runWithPostCommitEmailDelivery({
        commitBusinessEvent: async () => {
          throw businessError;
        },
        processOne,
        workerId: "immediate-worker",
      }),
    ).rejects.toBe(businessError);

    expect(processOne).not.toHaveBeenCalled();
  });

  it("skips delivery when the committed event has no email intent", async () => {
    const processOne = vi.fn();

    await expect(
      runWithPostCommitEmailDelivery({
        commitBusinessEvent: async () => ({
          businessResult: { archived: true },
          outboxId: null,
        }),
        processOne,
        workerId: "immediate-worker",
      }),
    ).resolves.toEqual({
      businessResult: { archived: true },
      emailDelivery: "not_required",
    });

    expect(processOne).not.toHaveBeenCalled();
  });
});
