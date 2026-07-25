import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { GoogleProfileInput } from "../../schemas/onboarding-form-schema";
import type { CorrectedProfileResubmissionCommand } from "../../schemas/corrected-profile-resubmission-schema";

export type CorrectedProfileResubmissionResult =
  | {
      kind: "already_submitted";
    }
  | {
      kind: "submitted";
    }
  | {
      code: "ACCOUNT_STALE" | "PROFILE_STALE";
      kind: "conflict";
    };

export type CorrectedProfileResubmissionPersistenceResult =
  | Exclude<CorrectedProfileResubmissionResult, { kind: "submitted" }>
  | {
      kind: "submitted";
      outboxId: string;
    };

export interface CorrectedProfileResubmissionRepository {
  resubmit(
    transaction: ApplicationTransaction,
    context: VerifiedAccountContext,
    input: {
      command: CorrectedProfileResubmissionCommand;
      profile: GoogleProfileInput;
      requestId: string;
    },
  ): Promise<CorrectedProfileResubmissionPersistenceResult>;
}

export type CorrectedProfileResubmissionErrorCode =
  "ROLE_MISMATCH" | "STATUS_FORBIDDEN";

export class CorrectedProfileResubmissionError extends Error {
  constructor(readonly code: CorrectedProfileResubmissionErrorCode) {
    super(code);
    this.name = "CorrectedProfileResubmissionError";
  }
}

export function createCorrectedProfileResubmissionService({
  emailDelivery,
  repository,
  runVerifiedTransaction,
}: {
  emailDelivery?: {
    processOne(input: {
      outboxId: string;
      workerId: string;
    }): Promise<
      | { kind: "claim_lost" }
      | { kind: "dead_letter" }
      | { kind: "failed" }
      | { kind: "not_claimed" }
      | { kind: "sent" }
    >;
  };
  repository: CorrectedProfileResubmissionRepository;
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}) {
  return {
    async resubmit(input: {
      command: CorrectedProfileResubmissionCommand;
      profile: GoogleProfileInput;
      requestId: string;
    }) {
      const businessResult = await runVerifiedTransaction(
        { requestId: input.requestId },
        async (transaction, context) => {
          if (
            (context.role !== "INFLUENCER" && context.role !== "COMPANY") ||
            context.role !== input.profile.role
          ) {
            throw new CorrectedProfileResubmissionError("ROLE_MISMATCH");
          }

          if (
            context.status !== "CHANGES_REQUESTED" &&
            context.status !== "PENDING_REVIEW"
          ) {
            throw new CorrectedProfileResubmissionError("STATUS_FORBIDDEN");
          }

          return repository.resubmit(transaction, context, input);
        },
      );

      if (businessResult.kind === "submitted" && emailDelivery) {
        await emailDelivery
          .processOne({
            outboxId: businessResult.outboxId,
            workerId: `resubmission:${crypto.randomUUID()}`,
          })
          .catch(() => undefined);
      }

      return businessResult.kind === "submitted"
        ? ({ kind: "submitted" } as const)
        : businessResult;
    },
  };
}
