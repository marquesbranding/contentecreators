export type AcceptableLegalDocumentType = "TERMS" | "PRIVACY";

/** Row returned by `app_list_pending_legal_documents()`, before PDF lookup. */
export interface PendingLegalDocumentRecord {
  documentType: AcceptableLegalDocumentType;
  id: string;
  publishedAt: string;
  versionLabel: string;
}

export interface PendingLegalDocumentDto {
  documentType: AcceptableLegalDocumentType;
  downloadName: string | null;
  id: string;
  pdfUrl: string | null;
  publishedLabel: string;
  title: string;
  versionLabel: string;
}

export type AcceptLegalDocumentsResult =
  { kind: "accepted" } | { kind: "stale" };

export type AcceptLegalDocumentsActionResult =
  { kind: "error" } | AcceptLegalDocumentsResult;
