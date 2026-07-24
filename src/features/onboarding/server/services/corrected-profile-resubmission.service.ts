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
      kind: "submitted" | "already_submitted";
    }
  | {
      code: "ACCOUNT_STALE" | "PROFILE_STALE";
      kind: "conflict";
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
  ): Promise<CorrectedProfileResubmissionResult>;
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
  repository,
  runVerifiedTransaction,
}: {
  repository: CorrectedProfileResubmissionRepository;
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}) {
  return {
    async resubmit(input: {
      command: CorrectedProfileResubmissionCommand;
      profile: GoogleProfileInput;
      requestId: string;
    }) {
      return runVerifiedTransaction(
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
    },
  };
}
