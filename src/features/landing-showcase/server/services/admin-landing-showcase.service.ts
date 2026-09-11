import "server-only";

import { applyVerifiedAuditContext } from "@/features/audit/server";
import {
  requireAdmin,
  type VerifiedAccountContext,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type { LandingShowcaseCommand } from "../../api/landing-showcase-management.contract";
import {
  LandingShowcaseRepositoryError,
  type LandingShowcaseRepository,
  type LandingShowcaseRepositoryErrorCode,
} from "../repositories/landing-showcase.repository";

export type LandingShowcaseServiceErrorCode =
  LandingShowcaseRepositoryErrorCode;

export class LandingShowcaseServiceError extends Error {
  constructor(readonly code: LandingShowcaseServiceErrorCode) {
    super(code);
    this.name = "LandingShowcaseServiceError";
  }
}

/**
 * Toggling a profile is a one-click action, so the admin is not asked to type
 * a reason; the audit trail still records who did it, when, and this summary.
 */
const auditReasons = {
  DISABLE: {
    COMPANY: "Empresa removida da vitrine da landing page.",
    CREATOR: "Creator removido da vitrine da landing page.",
  },
  ENABLE: {
    COMPANY: "Empresa incluída na vitrine da landing page.",
    CREATOR: "Creator incluído na vitrine da landing page.",
  },
  MOVE_DOWN: {
    COMPANY: "Empresa movida para depois na vitrine da landing page.",
    CREATOR: "Creator movido para depois na vitrine da landing page.",
  },
  MOVE_UP: {
    COMPANY: "Empresa movida para antes na vitrine da landing page.",
    CREATOR: "Creator movido para antes na vitrine da landing page.",
  },
} as const satisfies Record<
  LandingShowcaseCommand["action"],
  Record<LandingShowcaseCommand["kind"], string>
>;

function assertAdmin(actor: VerifiedAccountContext) {
  requireAdmin({
    id: actor.accountId,
    role: actor.role,
    status: actor.status,
  });
}

export function createAdminLandingShowcaseService({
  repository,
  runVerifiedTransaction,
}: {
  repository: LandingShowcaseRepository;
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}) {
  return {
    list(requestId: string) {
      return runVerifiedTransaction(
        { requestId },
        async (transaction, actor) => {
          assertAdmin(actor);

          return repository.listCandidates(transaction);
        },
      );
    },

    async command(input: LandingShowcaseCommand, requestId: string) {
      try {
        return await runVerifiedTransaction(
          { requestId },
          async (transaction, actor) => {
            assertAdmin(actor);
            await applyVerifiedAuditContext(transaction, {
              actorAccountId: actor.accountId,
              actorRole: "ADMIN",
              actorType: "ADMIN",
              reason: auditReasons[input.action][input.kind],
              requestId,
              source: "BACKOFFICE",
            });
            await repository.applyCommand(transaction, input);

            return repository.listCandidates(transaction);
          },
        );
      } catch (error) {
        if (error instanceof LandingShowcaseRepositoryError) {
          throw new LandingShowcaseServiceError(error.code);
        }

        throw error;
      }
    },
  };
}
