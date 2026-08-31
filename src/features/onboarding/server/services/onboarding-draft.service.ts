import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import type { AccountRolePreference } from "@/features/identity/server";

import {
  onboardingDraftSaveSchema,
  type OnboardingDraftSaveInput,
} from "../../schemas/onboarding-draft-schema";

type DraftRole = OnboardingDraftSaveInput["role"];
type DraftPayload = OnboardingDraftSaveInput["payload"];
type OwnerStatus =
  | "APPROVED"
  | "BANNED"
  | "CHANGES_REQUESTED"
  | "ONBOARDING"
  | "PENDING_REVIEW"
  | "SUSPENDED";

export interface OnboardingDraftDto {
  payload: DraftPayload;
  role: DraftRole;
  updatedAt: Date;
  version: number;
}

interface OwnerDraftContext {
  accountId: string;
  role: "ADMIN" | DraftRole;
  status: OwnerStatus;
}

export type OwnerDraftTransactionRunner = <T>(
  request: { preferredRole?: AccountRolePreference; requestId: string },
  work: (
    transaction: ApplicationTransaction,
    owner: OwnerDraftContext,
  ) => Promise<T>,
) => Promise<T>;

export interface OnboardingDraftRepository {
  loadOwnerDraft(
    transaction: ApplicationTransaction,
    accountId: string,
  ): Promise<OnboardingDraftDto | null>;
  saveOwnerDraft(
    transaction: ApplicationTransaction,
    input: OnboardingDraftSaveInput & { accountId: string },
  ): Promise<
    | { currentVersion: number; kind: "conflict" }
    | { draft: OnboardingDraftDto; kind: "saved" }
  >;
}

export type OnboardingDraftErrorCode =
  "INVALID_INPUT" | "ROLE_MISMATCH" | "STATUS_FORBIDDEN";

export class OnboardingDraftError extends Error {
  constructor(readonly code: OnboardingDraftErrorCode) {
    super(code);
    this.name = "OnboardingDraftError";
  }
}

function requireDraftOwner(owner: OwnerDraftContext): asserts owner is {
  accountId: string;
  role: DraftRole;
  status: "CHANGES_REQUESTED" | "ONBOARDING";
} {
  if (owner.role !== "COMPANY" && owner.role !== "INFLUENCER") {
    throw new OnboardingDraftError("ROLE_MISMATCH");
  }

  if (owner.status !== "ONBOARDING" && owner.status !== "CHANGES_REQUESTED") {
    throw new OnboardingDraftError("STATUS_FORBIDDEN");
  }
}

const conflictMessage =
  "Este cadastro foi atualizado em outra aba. Recarregue os dados antes de continuar.";

export function createOnboardingDraftService({
  repository,
  runOwnerTransaction,
}: {
  repository: OnboardingDraftRepository;
  runOwnerTransaction: OwnerDraftTransactionRunner;
}) {
  return {
    async loadOwnerDraft({ requestId }: { requestId: string }) {
      return runOwnerTransaction(
        { preferredRole: "NON_ADMIN", requestId },
        (transaction, owner) => {
          requireDraftOwner(owner);
          return repository.loadOwnerDraft(transaction, owner.accountId);
        },
      );
    },

    async saveOwnerDraft(
      input: OnboardingDraftSaveInput & { requestId: string },
    ) {
      const parsed = onboardingDraftSaveSchema.safeParse({
        expectedVersion: input.expectedVersion,
        payload: input.payload,
        role: input.role,
      });

      if (!parsed.success) {
        throw new OnboardingDraftError("INVALID_INPUT");
      }

      return runOwnerTransaction(
        { preferredRole: "NON_ADMIN", requestId: input.requestId },
        async (transaction, owner) => {
          requireDraftOwner(owner);

          if (owner.role !== parsed.data.role) {
            throw new OnboardingDraftError("ROLE_MISMATCH");
          }

          const result = await repository.saveOwnerDraft(transaction, {
            accountId: owner.accountId,
            ...parsed.data,
          });

          return result.kind === "conflict"
            ? { ...result, message: conflictMessage }
            : result;
        },
      );
    },
  };
}
