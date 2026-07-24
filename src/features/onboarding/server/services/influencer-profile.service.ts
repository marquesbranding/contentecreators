import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import {
  requireApproved,
  requireRole,
  type CurrentAccountDto,
  type VerifiedAccountContext,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { InfluencerProfileEditInput } from "../../schemas/influencer-profile-edit-schema";
import type {
  InfluencerProfileDto,
  InfluencerProfileUpdateResult,
} from "../../types/influencer-profile.types";

export interface InfluencerProfileRepository {
  loadApprovedProfile(
    transaction: ApplicationTransaction,
    accountId: string,
  ): Promise<InfluencerProfileDto | null>;
  updateApprovedProfile(
    transaction: ApplicationTransaction,
    accountId: string,
    input: InfluencerProfileEditInput,
    requestId: string,
  ): Promise<InfluencerProfileUpdateResult>;
}

function requireApprovedInfluencer(
  context: VerifiedAccountContext,
): CurrentAccountDto {
  const account: CurrentAccountDto = {
    id: context.accountId,
    role: context.role,
    status: context.status,
  };

  requireRole(account, ["INFLUENCER"]);
  requireApproved(account);
  return account;
}

export function createInfluencerProfileService({
  repository,
  runVerifiedTransaction,
}: {
  repository: InfluencerProfileRepository;
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}) {
  return {
    async loadOwnerProfile({ requestId }: { requestId: string }) {
      return runVerifiedTransaction(
        { requestId },
        async (transaction, context) => {
          const account = requireApprovedInfluencer(context);
          const profile = await repository.loadApprovedProfile(
            transaction,
            account.id,
          );

          if (!profile) {
            throw new Error("Approved influencer profile was not found.");
          }

          return profile;
        },
      );
    },

    async updateOwnerProfile({
      input,
      requestId,
    }: {
      input: InfluencerProfileEditInput;
      requestId: string;
    }) {
      return runVerifiedTransaction(
        { requestId },
        async (transaction, context) => {
          const account = requireApprovedInfluencer(context);

          return repository.updateApprovedProfile(
            transaction,
            account.id,
            input,
            requestId,
          );
        },
      );
    },
  };
}
