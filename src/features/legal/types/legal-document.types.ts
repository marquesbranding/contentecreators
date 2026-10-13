export type LegalDocumentType = "TERMS" | "PRIVACY" | "CONTACT_VISIBILITY";

export type LegalPdfDocument = {
  documentType: "TERMS" | "PRIVACY";
  title: string;
  versionLabel: string;
  /** ISO date (yyyy-mm-dd) the version was published. */
  publishedOn: string;
  updatedLabel: string;
  /** Public URL served from `public/`. */
  pdfUrl: string;
  /** Path of the same file relative to the repository root. */
  pdfFile: string;
  downloadName: string;
};
