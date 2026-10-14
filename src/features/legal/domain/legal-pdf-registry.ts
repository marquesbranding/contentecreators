import { publishedLegalPdfs } from "@/features/legal/content/legal-pdfs";
import type { LegalPdfDocument } from "@/features/legal/types/legal-document.types";

export { publishedLegalPdfs };

/** Pure lookup, safe for client and server: no filesystem access. */
export function findLegalPdf(
  documentType: LegalPdfDocument["documentType"] | string,
  versionLabel: string,
): LegalPdfDocument | null {
  return (
    publishedLegalPdfs.find(
      (document) =>
        document.documentType === documentType &&
        document.versionLabel === versionLabel,
    ) ?? null
  );
}
