import "server-only";

import { findLegalPdf } from "@/features/legal/domain/legal-pdf-registry";
import { VerifiedAccountTransactionError } from "@/features/identity/server";
import { operationalLogger } from "@/shared/server/observability/operational-logger";

import { createServerLegalAcceptanceRepository } from "../repositories/drizzle-legal-acceptance.repository";
import type {
  AcceptableLegalDocumentType,
  PendingLegalDocumentDto,
} from "../../types/legal-acceptance.types";

const fallbackTitles: Record<AcceptableLegalDocumentType, string> = {
  PRIVACY: "Política de Privacidade",
  TERMS: "Termos de Uso",
};

const publishedDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  // Publication dates are stored as UTC midnight of the calendar day.
  timeZone: "UTC",
  year: "numeric",
});

/**
 * Pending TERMS/PRIVACY documents for the signed-in account, joined with the
 * PDF registry. A document without a registered PDF is still listed and
 * acceptable; only the download/open links are missing.
 */
export async function loadPendingLegalDocuments(): Promise<
  PendingLegalDocumentDto[]
> {
  const requestId = crypto.randomUUID();

  try {
    const repository = await createServerLegalAcceptanceRepository();
    const records = await repository.listPending({ requestId });

    return records.map((record) => {
      const pdf = findLegalPdf(record.documentType, record.versionLabel);

      if (!pdf) {
        operationalLogger.warn({
          event: "legal_pdf_missing_from_registry",
          operation: "load_pending_legal_documents",
          outcome: "error",
          requestId,
          details: {
            documentType: record.documentType,
            versionLabel: record.versionLabel,
          },
        });
      }

      return {
        documentType: record.documentType,
        downloadName: pdf?.downloadName ?? null,
        id: record.id,
        pdfUrl: pdf?.pdfUrl ?? null,
        publishedLabel: publishedDateFormatter.format(
          new Date(record.publishedAt),
        ),
        title: pdf?.title ?? fallbackTitles[record.documentType],
        versionLabel: record.versionLabel,
      };
    });
  } catch (error) {
    /* Public pages under /app (e.g. blocked/status) render without a usable
     * account; there is nothing to accept there. */
    if (
      error instanceof VerifiedAccountTransactionError &&
      (error.code === "UNAUTHENTICATED" || error.code === "ACCOUNT_NOT_READY")
    ) {
      return [];
    }

    throw error;
  }
}
