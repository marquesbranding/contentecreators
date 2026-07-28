import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import type { VerifiedAuditContext } from "@/features/audit/server";
import {
  requireApproved,
  requireRole,
  type CurrentAccountDto,
  type VerifiedAccountContext,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { CompanyProfileEditInput } from "../../schemas/company-profile-edit-schema";
import type {
  CompanyProfileDto,
  CompanyProfileUpdateResult,
} from "../../types/company-profile.types";

export interface CompanyProfileRepository {
  loadApprovedProfile(
    transaction: ApplicationTransaction,
    accountId: string,
  ): Promise<CompanyProfileDto | null>;
  updateApprovedProfile(
    transaction: ApplicationTransaction,
    accountId: string,
    input: CompanyProfileEditInput,
    requestId: string,
    auditReason?: string,
    auditContext?: VerifiedAuditContext,
  ): Promise<CompanyProfileUpdateResult>;
}

function requireApprovedCompany(
  context: VerifiedAccountContext,
): CurrentAccountDto {
  const account: CurrentAccountDto = {
    id: context.accountId,
    role: context.role,
    status: context.status,
  };

  requireRole(account, ["COMPANY"]);
  requireApproved(account);
  return account;
}

export function createCompanyProfileService({
  repository,
  runVerifiedTransaction,
}: {
  repository: CompanyProfileRepository;
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}) {
  return {
    async loadOwnerProfile({ requestId }: { requestId: string }) {
      return runVerifiedTransaction(
        { requestId },
        async (transaction, context) => {
          const account = requireApprovedCompany(context);
          const profile = await repository.loadApprovedProfile(
            transaction,
            account.id,
          );

          if (!profile) {
            throw new Error("Approved company profile was not found.");
          }

          return profile;
        },
      );
    },

    async updateOwnerProfile({
      input,
      requestId,
    }: {
      input: CompanyProfileEditInput;
      requestId: string;
    }) {
      return runVerifiedTransaction(
        { requestId },
        async (transaction, context) => {
          const account = requireApprovedCompany(context);

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
