import type { LegalPdfDocument } from "@/features/legal/types/legal-document.types";

/**
 * Official documents, published as the signed PDFs delivered by the legal
 * owner. The PDF bytes are the source of truth: `content_hash` in
 * `legal_documents` is the SHA-256 of the file. Never replace a published file;
 * add a new version and a migration instead.
 */
export const termsPdfV1_0: LegalPdfDocument = {
  documentType: "TERMS",
  title: "Termos de Uso",
  versionLabel: "1.0",
  publishedOn: "2026-10-01",
  updatedLabel: "01/10/2026",
  pdfUrl: "/legal/termos-de-uso-v1.0.pdf",
  pdfFile: "public/legal/termos-de-uso-v1.0.pdf",
  downloadName: "Contente Creators - Termos de Uso.pdf",
};

export const privacyPdfV1_0: LegalPdfDocument = {
  documentType: "PRIVACY",
  title: "Política de Privacidade",
  versionLabel: "1.0",
  publishedOn: "2026-10-01",
  updatedLabel: "01/10/2026",
  pdfUrl: "/legal/politica-de-privacidade-v1.0.pdf",
  pdfFile: "public/legal/politica-de-privacidade-v1.0.pdf",
  downloadName: "Contente Creators - Política de Privacidade.pdf",
};
