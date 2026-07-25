import "server-only";

import {
  calculateOutboxRetryAt,
  defaultOutboxRetryPolicy,
  resolveOutboxFailureState,
  sanitizeOutboxMetadata,
  type OutboxRetryPolicy,
} from "../../domain/outbox-retry-policy";
import type {
  ClaimedEmailOutboxItem,
  OutboxDeliveryPort,
} from "../../types/outbox-processing.types";

type ClaimCompletion = { kind: "claim_lost" | "recorded" };
type FailureStatus = "DEAD_LETTER" | "FAILED";

export interface EmailOutboxRepository {
  claimDue(input: {
    limit: number;
    now: Date;
    outboxId: string | null;
    workerId: string;
  }): Promise<ClaimedEmailOutboxItem[]>;
  recordFailure(input: {
    claim: ClaimedEmailOutboxItem;
    completedAt: Date;
    errorCategory: string;
    errorCode: string | null;
    nextDueAt: Date | null;
    status: FailureStatus;
  }): Promise<ClaimCompletion>;
  recordSuccess(input: {
    claim: ClaimedEmailOutboxItem;
    completedAt: Date;
    providerMessageIdHash: string | null;
    responseCode: string | null;
  }): Promise<ClaimCompletion>;
}

interface EmailOutboxProcessorDependencies {
  deliveryPort: OutboxDeliveryPort;
  now?: () => Date;
  repository: EmailOutboxRepository;
  retryPolicy?: OutboxRetryPolicy;
}

type ProcessOneResult =
  | { kind: "claim_lost" }
  | { kind: "dead_letter" }
  | { kind: "failed" }
  | { kind: "not_claimed" }
  | { kind: "sent" };

function normalizeProviderMessageIdHash(
  providerMessageIdHash: string | undefined,
) {
  return providerMessageIdHash &&
    /^[a-fA-F0-9]{64}$/.test(providerMessageIdHash)
    ? providerMessageIdHash.toLowerCase()
    : null;
}

export function createEmailOutboxProcessor(
  dependencies: EmailOutboxProcessorDependencies,
) {
  const now = dependencies.now ?? (() => new Date());
  const retryPolicy = dependencies.retryPolicy ?? defaultOutboxRetryPolicy;

  async function recordFailure(
    claim: ClaimedEmailOutboxItem,
    failure: {
      errorCategory: string;
      errorCode?: string;
      retryable: boolean;
    },
  ): Promise<ProcessOneResult> {
    const completedAt = now();
    const status = resolveOutboxFailureState({
      attemptNumber: claim.attemptNumber,
      maxAttempts: claim.maxAttempts,
      retryable: failure.retryable,
    });
    const completion = await dependencies.repository.recordFailure({
      claim,
      completedAt,
      errorCategory:
        sanitizeOutboxMetadata(failure.errorCategory, 80) ?? "PROVIDER_FAILURE",
      errorCode: sanitizeOutboxMetadata(failure.errorCode, 80),
      nextDueAt:
        status === "FAILED"
          ? calculateOutboxRetryAt({
              attemptNumber: claim.attemptNumber,
              now: completedAt,
              policy: retryPolicy,
            })
          : null,
      status,
    });

    if (completion.kind === "claim_lost") {
      return { kind: "claim_lost" };
    }

    return status === "FAILED" ? { kind: "failed" } : { kind: "dead_letter" };
  }

  async function deliverClaim(
    claim: ClaimedEmailOutboxItem,
  ): Promise<ProcessOneResult> {
    let deliveryResult;

    try {
      deliveryResult = await dependencies.deliveryPort.deliver({
        idempotencyKey: claim.idempotencyKey,
        outboxId: claim.id,
        payload: claim.payload,
        recipientEmail: claim.recipientEmail,
        template: claim.template,
      });
    } catch {
      return recordFailure(claim, {
        errorCategory: "UNEXPECTED",
        retryable: true,
      });
    }

    if (deliveryResult.kind === "failed") {
      return recordFailure(claim, {
        errorCategory: deliveryResult.errorCategory,
        errorCode: deliveryResult.errorCode,
        retryable: deliveryResult.retryable ?? true,
      });
    }

    const completion = await dependencies.repository.recordSuccess({
      claim,
      completedAt: now(),
      providerMessageIdHash: normalizeProviderMessageIdHash(
        deliveryResult.providerMessageIdHash,
      ),
      responseCode: sanitizeOutboxMetadata(deliveryResult.responseCode, 40),
    });

    return completion.kind === "recorded"
      ? { kind: "sent" }
      : { kind: "claim_lost" };
  }

  async function processOne(input: {
    outboxId: string;
    workerId: string;
  }): Promise<ProcessOneResult> {
    const [claim] = await dependencies.repository.claimDue({
      limit: 1,
      now: now(),
      outboxId: input.outboxId,
      workerId: input.workerId,
    });

    return claim ? deliverClaim(claim) : { kind: "not_claimed" };
  }

  return {
    async processDue(input: { limit: number; workerId: string }) {
      const claims = await dependencies.repository.claimDue({
        limit: input.limit,
        now: now(),
        outboxId: null,
        workerId: input.workerId,
      });
      const summary = {
        claimLost: 0,
        claimed: claims.length,
        deadLetter: 0,
        failed: 0,
        sent: 0,
      };

      for (const claim of claims) {
        const result = await deliverClaim(claim);

        if (result.kind === "claim_lost") {
          summary.claimLost += 1;
        } else if (result.kind === "dead_letter") {
          summary.deadLetter += 1;
        } else if (result.kind === "failed") {
          summary.failed += 1;
        } else if (result.kind === "sent") {
          summary.sent += 1;
        }
      }

      return summary;
    },
    processOne,
  };
}
