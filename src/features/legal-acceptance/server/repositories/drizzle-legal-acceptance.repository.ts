import "server-only";

import { sql } from "drizzle-orm";

import { applyVerifiedAuditContext } from "@/features/audit/server";
import {
  createServerVerifiedAccountTransactionRunner,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import type {
  AcceptLegalDocumentsResult,
  PendingLegalDocumentRecord,
} from "../../types/legal-acceptance.types";

interface PendingFunctionRow extends Record<string, unknown> {
  document_type: PendingLegalDocumentRecord["documentType"];
  id: string;
  published_at: Date | string;
  version_label: string;
}

interface AcceptFunctionRow extends Record<string, unknown> {
  app_accept_legal_documents: number;
}

export const STALE_LEGAL_DOCUMENTS_MESSAGE = "legal_documents_not_current";

export interface LegalAcceptanceRepository {
  accept(input: {
    documentIds: string[];
    requestId: string;
  }): Promise<AcceptLegalDocumentsResult>;
  listPending(input: {
    requestId: string;
  }): Promise<PendingLegalDocumentRecord[]>;
}

interface DrizzleLegalAcceptanceDependencies {
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

/** Walks the error cause chain: Drizzle wraps driver errors. */
export function isStaleLegalDocumentError(error: unknown): boolean {
  let current: unknown = error;

  while (current instanceof Error) {
    if (current.message.includes(STALE_LEGAL_DOCUMENTS_MESSAGE)) {
      return true;
    }
    current = current.cause;
  }

  return false;
}

export function createDrizzleLegalAcceptanceRepository({
  runVerifiedAccountTransaction,
}: DrizzleLegalAcceptanceDependencies): LegalAcceptanceRepository {
  return {
    async accept({ documentIds, requestId }) {
      try {
        return await runVerifiedAccountTransaction(
          { preferredRole: "NON_ADMIN", requestId },
          async (transaction, actor) => {
            await applyVerifiedAuditContext(transaction, {
              actorAccountId: actor.accountId,
              actorRole: actor.role,
              actorType: "USER",
              reason: "Re-accepted updated legal documents",
              requestId,
              source: "APPLICATION",
            });

            // Drizzle expands a JS array into a row list, so the uuid[] is sent
            // as a Postgres array literal. Ids are validated as uuids upstream.
            const documentIdsLiteral = `{${documentIds.join(",")}}`;

            await transaction.execute<AcceptFunctionRow>(sql`
              select public.app_accept_legal_documents(
                ${documentIdsLiteral}::uuid[],
                ${requestId}::text
              )
            `);

            return { kind: "accepted" } as const;
          },
        );
      } catch (error) {
        if (isStaleLegalDocumentError(error)) {
          return { kind: "stale" };
        }

        throw error;
      }
    },

    async listPending({ requestId }) {
      return runVerifiedAccountTransaction(
        { preferredRole: "NON_ADMIN", requestId },
        async (transaction) => {
          const rows = await transaction.execute<PendingFunctionRow>(sql`
            select id, document_type, version_label, published_at
            from public.app_list_pending_legal_documents()
          `);

          return rows.map((row) => ({
            documentType: row.document_type,
            id: row.id,
            publishedAt: new Date(row.published_at).toISOString(),
            versionLabel: row.version_label,
          }));
        },
      );
    },
  };
}

export async function createServerLegalAcceptanceRepository() {
  return createDrizzleLegalAcceptanceRepository({
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
