import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import type { VerifiedAuditContext } from "@/features/audit/server";
import {
  AccountAccessError,
  type VerifiedAccountContext,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { isRecentLogin } from "../../domain/deletion-policy";
import type { DeletedAccount } from "../../types/account-deletion.types";
import type { AccountDeletionIdentityGateway } from "../gateways/supabase-account-deletion-identity.gateway";
import { collectErrorMessages } from "./account-deletion-errors";
import type { StorageCleanup } from "./storage-cleanup.service";

export type DeleteAccountResult =
  | { kind: "deleted" }
  | { kind: "invalid_password" }
  | { kind: "not_available" }
  | { kind: "reauthentication_required" };

interface Repository {
  deleteOwnAccount(
    transaction: ApplicationTransaction,
  ): Promise<DeletedAccount>;
}

export interface AccountDeletionLogEvent {
  count?: number;
  event:
    | "account_deletion_completed"
    | "account_deletion_session_revoke_failed"
    | "account_deletion_storage_deferred";
  level: "error" | "info" | "warn";
  requestId: string;
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
    "getReauthenticationContext" | "signOutEverywhere" | "verifyPassword"
  >;
  log?: (event: AccountDeletionLogEvent) => void;
  now?: () => Date;
  repository: Repository;
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
  storage: Pick<StorageCleanup, "remove">;
}

const NOT_AVAILABLE_MARKERS = [
  "account_deletion_banned",
  "account_deletion_context_required",
  "account_deletion_not_available",
  "account_deletion_role_forbidden",
  "ACCOUNT_NOT_READY",
  "ROLE_FORBIDDEN",
];

/**
 * Immediate, permanent deletion of the caller's own creator/company account.
 * The database step is one audited transaction; everything after the commit
 * (Storage, e-mail, sessions) is best effort and never undoes the deletion.
 */
export function createAccountDeletionService({
  applyAuditContext,
  deliverEmail,
  identity,
  log = () => undefined,
  now = () => new Date(),
  repository,
  runVerifiedTransaction,
  storage,
}: Dependencies) {
  return {
    async deleteAccount({
      password,
      requestId,
    }: {
      password?: string;
      requestId: string;
    }): Promise<DeleteAccountResult> {
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

      let deleted: DeletedAccount;

      try {
        deleted = await runVerifiedTransaction(
          { preferredRole: "NON_ADMIN", requestId },
          async (transaction, context: VerifiedAccountContext) => {
            // Only the linked creator/company row is ever deleted; an ADMIN row
            // of the same login stays untouched.
            if (context.role === "ADMIN") {
              throw new AccountAccessError("ROLE_FORBIDDEN");
            }

            await applyAuditContext(transaction, {
              actorAccountId: context.accountId,
              actorRole: context.role,
              actorType: "USER",
              reason: "Exclusão de conta pelo titular",
              requestId,
              source: "APPLICATION",
            });

            return repository.deleteOwnAccount(transaction);
          },
        );
      } catch (error) {
        const message = collectErrorMessages(error);

        if (NOT_AVAILABLE_MARKERS.some((marker) => message.includes(marker))) {
          return { kind: "not_available" };
        }

        throw error;
      }

      // The data is gone from the database. Objects that cannot be removed now
      // stay in the cleanup queue (orphaned objects are unreachable: their
      // media rows no longer exist and URLs are signed).
      try {
        const removal = await storage.remove(deleted.storageObjects);

        if (removal.failed > 0) {
          log({
            count: removal.failed,
            event: "account_deletion_storage_deferred",
            level: "warn",
            requestId,
          });
        }
      } catch {
        log({
          count: deleted.storageObjects.length,
          event: "account_deletion_storage_deferred",
          level: "warn",
          requestId,
        });
      }

      try {
        await deliverEmail?.({
          outboxId: deleted.outboxId,
          workerId: `account-deletion:${crypto.randomUUID()}`,
        });
      } catch {
        // The outbox row is committed; the scheduled fallback retries delivery.
      }

      // The login is kept and never banned: only its sessions end.
      let revoked = false;

      try {
        revoked = await identity.signOutEverywhere();
      } catch {
        revoked = false;
      }

      if (!revoked) {
        log({
          event: "account_deletion_session_revoke_failed",
          level: "error",
          requestId,
        });
      }

      log({ event: "account_deletion_completed", level: "info", requestId });

      return { kind: "deleted" };
    },
  };
}
