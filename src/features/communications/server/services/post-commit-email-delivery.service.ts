import "server-only";

type ImmediateOutboxResult =
  | { kind: "claim_lost" }
  | { kind: "dead_letter" }
  | { kind: "failed" }
  | { kind: "not_claimed" }
  | { kind: "sent" };

export async function runWithPostCommitEmailDelivery<T>(input: {
  commitBusinessEvent: () => Promise<{
    businessResult: T;
    outboxId: string | null;
  }>;
  processOne: (delivery: {
    outboxId: string;
    workerId: string;
  }) => Promise<ImmediateOutboxResult>;
  workerId: string;
}) {
  const committed = await input.commitBusinessEvent();

  if (!committed.outboxId) {
    return {
      businessResult: committed.businessResult,
      emailDelivery: "not_required" as const,
    };
  }

  try {
    const delivery = await input.processOne({
      outboxId: committed.outboxId,
      workerId: input.workerId,
    });

    return {
      businessResult: committed.businessResult,
      emailDelivery:
        delivery.kind === "sent" ? ("sent" as const) : ("deferred" as const),
    };
  } catch {
    return {
      businessResult: committed.businessResult,
      emailDelivery: "deferred" as const,
    };
  }
}
