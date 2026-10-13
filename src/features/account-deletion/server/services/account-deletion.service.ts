import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import type { VerifiedAuditContext } from "@/features/audit/server";
import {
  AccountAccessError,
  requireAdmin,
  type VerifiedAccountContext,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { isRecentLogin } from "../../domain/deletion-policy";
import type {
  RecoveredAccount,
  RequestedAccountDeletion,
} from "../../types/account-deletion.types";
import type { AccountDeletionIdentityGateway } from "../gateways/supabase-account-deletion-identity.gateway";
import { collectErrorMessages } from "./account-deletion-errors";

export type RequestDeletionResult =
  | { kind: "invalid_password" }
  | { kind: "not_available" }
  | { kind: "reauthentication_required" }
  | { eliminationEligibleAt: Date; kind: "requested" };

export type RecoverAccountResult =
  { kind: "not_recoverable" } | { kind: "recovered"; accountId: string };

interface Repository {
  recoverAccount(
    transaction: ApplicationTransaction,
    input: { accountId: string; reason: string },
  ): Promise<RecoveredAccount>;
  requestOwnDeletion(
    transaction: ApplicationTransaction,
  ): Promise<RequestedAccountDeletion>;
}

interface Dependencies {
  applyAuditContext(
    transaction: ApplicationTransaction,
    context: VerifiedAuditContext,
  ): Promise<void>;
  deliverEmail?(delivery: {
    outboxId: string;
    workerId: string;
  }): Promise<void>;
  identity: Pick<
    AccountDeletionIdentityGateway,
    | "banIdentity"
    | "getReauthenticationContext"
    | "signOutEverywhere"
    | "unbanIdentity"
    | "verifyPassword"
  >;
  now?: () => Date;
  repository: Repository;
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}

const NOT_AVAILABLE_MARKERS = [
  "account_deletion_banned",
  "account_deletion_context_required",
  "account_deletion_not_available",
  "account_deletion_role_forbidden",
];

const NOT_RECOVERABLE_MARKERS = [
  "account_recovery_not_pending",
  "account_recovery_window_closed",
];

export function createAccountDeletionService({
  applyAuditContext,
  deliverEmail,
  identity,
  now = () => new Date(),
  repository,
  runVerifiedTransaction,
}: Dependencies) {
  async function deliverQuietly(outboxId: string, source: string) {
    try {
      await deliverEmail?.({
        outboxId,
        workerId: `${source}:${crypto.randomUUID()}`,
      });
    } catch {
      // The outbox row is committed; the scheduled fallback retries delivery.
    }
  }

  return {
    async requestDeletion({
      password,
      requestId,
    }: {
      password?: string;
      requestId: string;
    }): Promise<RequestDeletionResult> {
      const reauthentication = await identity.getReauthenticationContext();

      if (!reauthentication) {
        return { kind: "not_available" };
      }

      if (reauthentication.hasPassword) {
        if (
          !password ||
          !reauthentication.email ||
          !(await identity.verifyPassword(reauthentication.email, password))
        ) {
          return { kind: "invalid_password" };
        }
      } else if (!isRecentLogin(reauthentication.lastSignInAt, now())) {
        return { kind: "reauthentication_required" };
      }

      let requested: RequestedAccountDeletion;

      try {
        requested = await runVerifiedTransaction(
          { preferredRole: "NON_ADMIN", requestId },
          async (transaction, context: VerifiedAccountContext) => {
            if (context.role === "ADMIN") {
              throw new AccountAccessError("ROLE_FORBIDDEN");
            }

            await applyAuditContext(transaction, {
              actorAccountId: context.accountId,
              actorRole: context.role,
              actorType: "USER",
              reason: "Exclusão de conta solicitada pelo titular",
              requestId,
              source: "APPLICATION",
            });

            return repository.requestOwnDeletion(transaction);
          },
        );
      } catch (error) {
        const message = collectErrorMessages(error);

        if (
          NOT_AVAILABLE_MARKERS.some((marker) => message.includes(marker)) ||
          message.includes("ACCOUNT_NOT_READY") ||
          message.includes("ROLE_FORBIDDEN")
        ) {
          return { kind: "not_available" };
        }

        throw error;
      }

      await deliverQuietly(requested.outboxId, "account-deletion");

      // The account is already hidden and archived. Locking the identity and
      // revoking sessions keeps the owner out; a failure here is retried by the
      // scheduled routine only after elimination, so it must not be silent.
      const locked = await identity.banIdentity(requested.authUserId);
      await identity.signOutEverywhere();

      if (!locked) {
        throw new Error("account_deletion_identity_lock_failed");
      }

      return {
        eliminationEligibleAt: requested.eliminationEligibleAt,
        kind: "requested",
      };
    },

    async recoverAccount({
      accountId,
      reason,
      requestId,
    }: {
      accountId: string;
      reason: string;
      requestId: string;
    }): Promise<RecoverAccountResult> {
      let recovered: RecoveredAccount;

      try {
        recovered = await runVerifiedTransaction(
          { preferredRole: "ADMIN", requestId },
          async (transaction, context) => {
            requireAdmin({
              id: context.accountId,
              role: context.role,
              status: context.status,
            });
            await applyAuditContext(transaction, {
              actorAccountId: context.accountId,
              actorRole: "ADMIN",
              actorType: "ADMIN",
              reason,
              requestId,
              source: "BACKOFFICE",
            });

            return repository.recoverAccount(transaction, {
              accountId,
              reason,
            });
          },
        );
      } catch (error) {
        const message = collectErrorMessages(error);

        if (
          NOT_RECOVERABLE_MARKERS.some((marker) => message.includes(marker))
        ) {
          return { kind: "not_recoverable" };
        }

        throw error;
      }

      if (!(await identity.unbanIdentity(recovered.authUserId))) {
        throw new Error("account_recovery_identity_unlock_failed");
      }

      await deliverQuietly(recovered.outboxId, "account-recovery");

      return { accountId: recovered.accountId, kind: "recovered" };
    },
  };
}
