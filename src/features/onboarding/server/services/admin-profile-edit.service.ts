import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import {
  requireAdmin,
  type CurrentAccountDto,
  type VerifiedAccountContext,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { CompanyProfileEditInput } from "../../schemas/company-profile-edit-schema";
import type { InfluencerProfileEditInput } from "../../schemas/influencer-profile-edit-schema";
import type { CompanyProfileRepository } from "./company-profile.service";
import type { InfluencerProfileRepository } from "./influencer-profile.service";

type EditableProfileRole = "COMPANY" | "INFLUENCER";
type EditableProfileStatus =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "ONBOARDING"
  | "PENDING_REVIEW"
  | "SUSPENDED";

export interface AdminProfileTarget {
  role: EditableProfileRole;
  status: EditableProfileStatus | "BANNED";
}

export interface AdminProfileTargetRepository {
  loadTarget(
    transaction: ApplicationTransaction,
    accountId: string,
  ): Promise<AdminProfileTarget | null>;
}

export type AdminProfileEditErrorCode =
  "TARGET_NOT_EDITABLE" | "TARGET_NOT_FOUND" | "TARGET_ROLE_MISMATCH";

export class AdminProfileEditError extends Error {
  constructor(readonly code: AdminProfileEditErrorCode) {
    super(code);
    this.name = "AdminProfileEditError";
  }
}

function requireApprovedAdmin(context: VerifiedAccountContext) {
  const account: CurrentAccountDto = {
    id: context.accountId,
    role: context.role,
    status: context.status,
  };

  requireAdmin(account);
  return account;
}

function requireEditableTarget(
  target: AdminProfileTarget | null,
  expectedRole?: EditableProfileRole,
) {
  if (!target) {
    throw new AdminProfileEditError("TARGET_NOT_FOUND");
  }

  if (expectedRole && target.role !== expectedRole) {
    throw new AdminProfileEditError("TARGET_ROLE_MISMATCH");
  }

  if (target.status === "BANNED") {
    throw new AdminProfileEditError("TARGET_NOT_EDITABLE");
  }

  return target;
}

export function createAdminProfileEditService({
  companyProfiles,
  influencerProfiles,
  runVerifiedTransaction,
  targets,
}: {
  companyProfiles: CompanyProfileRepository;
  influencerProfiles: InfluencerProfileRepository;
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
  targets: AdminProfileTargetRepository;
}) {
  async function withAdminTarget<T>({
    accountId,
    expectedRole,
    requestId,
    work,
  }: {
    accountId: string;
    expectedRole?: EditableProfileRole;
    requestId: string;
    work: (
      transaction: ApplicationTransaction,
      actor: CurrentAccountDto,
      target: AdminProfileTarget,
    ) => Promise<T>;
  }) {
    return runVerifiedTransaction(
      { requestId },
      async (transaction, context) => {
        const actor = requireApprovedAdmin(context);
        const target = requireEditableTarget(
          await targets.loadTarget(transaction, accountId),
          expectedRole,
        );

        return work(transaction, actor, target);
      },
    );
  }

  return {
    async loadEditableProfile({
      accountId,
      requestId,
    }: {
      accountId: string;
      requestId: string;
    }) {
      return withAdminTarget({
        accountId,
        requestId,
        work: async (transaction, _actor, target) => {
          if (target.role === "INFLUENCER") {
            const profile = await influencerProfiles.loadApprovedProfile(
              transaction,
              accountId,
            );
            if (!profile) {
              throw new AdminProfileEditError("TARGET_NOT_FOUND");
            }

            return { profile, role: "INFLUENCER" as const };
          }

          const profile = await companyProfiles.loadApprovedProfile(
            transaction,
            accountId,
          );
          if (!profile) {
            throw new AdminProfileEditError("TARGET_NOT_FOUND");
          }

          return { profile, role: "COMPANY" as const };
        },
      });
    },

    async updateCompanyProfile({
      accountId,
      input,
      reason,
      requestId,
    }: {
      accountId: string;
      input: CompanyProfileEditInput;
      reason: string;
      requestId: string;
    }) {
      return withAdminTarget({
        accountId,
        expectedRole: "COMPANY",
        requestId,
        work: (transaction, actor) =>
          companyProfiles.updateApprovedProfile(
            transaction,
            accountId,
            input,
            requestId,
            reason,
            {
              actorAccountId: actor.id,
              actorRole: "ADMIN",
              actorType: "ADMIN",
              reason,
              requestId,
              source: "BACKOFFICE",
            },
          ),
      });
    },

    async updateInfluencerProfile({
      accountId,
      input,
      reason,
      requestId,
    }: {
      accountId: string;
      input: InfluencerProfileEditInput;
      reason: string;
      requestId: string;
    }) {
      return withAdminTarget({
        accountId,
        expectedRole: "INFLUENCER",
        requestId,
        work: (transaction, actor) =>
          influencerProfiles.updateApprovedProfile(
            transaction,
            accountId,
            input,
            requestId,
            reason,
            {
              actorAccountId: actor.id,
              actorRole: "ADMIN",
              actorType: "ADMIN",
              reason,
              requestId,
              source: "BACKOFFICE",
            },
          ),
      });
    },
  };
}
