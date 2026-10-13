import { readFileSync } from "node:fs";
import { join } from "node:path";

import { contactVisibilityV1_0 } from "@/features/legal/content/contact-visibility.v1_0";
import {
  privacyPdfV1_0,
  termsPdfV1_0,
} from "@/features/legal/content/legal-pdfs";
import {
  hashLegalContent,
  hashLegalFile,
} from "@/features/legal/domain/legal-hash";
import type { LegalDocumentType } from "@/features/legal/types/legal-document.types";

export type PublishedLegalVersion = {
  documentType: LegalDocumentType;
  versionLabel: string;
  publishedOn: string;
  contentHash: string;
};

function pdfVersion(
  document: typeof termsPdfV1_0 | typeof privacyPdfV1_0,
): PublishedLegalVersion {
  return {
    contentHash: hashLegalFile(
      readFileSync(join(process.cwd(), document.pdfFile)),
    ),
    documentType: document.documentType,
    publishedOn: document.publishedOn,
    versionLabel: document.versionLabel,
  };
}

/** Node-only: reads the published PDFs from disk to compute their hashes. */
export function listPublishedLegalVersions(): PublishedLegalVersion[] {
  return [
    pdfVersion(termsPdfV1_0),
    pdfVersion(privacyPdfV1_0),
    {
      contentHash: hashLegalContent(contactVisibilityV1_0),
      documentType: contactVisibilityV1_0.documentType,
      publishedOn: contactVisibilityV1_0.publishedOn,
      versionLabel: contactVisibilityV1_0.versionLabel,
    },
  ];
}
