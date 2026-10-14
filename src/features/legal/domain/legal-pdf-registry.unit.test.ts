import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  findLegalPdf,
  publishedLegalPdfs,
} from "@/features/legal/domain/legal-pdf-registry";

describe("legal PDF registry", () => {
  it("resolves the official TERMS and PRIVACY 1.0 PDFs", () => {
    expect(findLegalPdf("TERMS", "1.0")?.pdfUrl).toBe(
      "/legal/termos-de-uso-v1.0.pdf",
    );
    expect(findLegalPdf("PRIVACY", "1.0")?.pdfUrl).toBe(
      "/legal/politica-de-privacidade-v1.0.pdf",
    );
  });

  it("returns null for unregistered versions", () => {
    expect(findLegalPdf("TERMS", "9.9")).toBeNull();
    expect(findLegalPdf("CONTACT_VISIBILITY", "1.0")).toBeNull();
  });

  it.each(publishedLegalPdfs)(
    "points $documentType $versionLabel at a file on disk",
    (document) => {
      expect(existsSync(join(process.cwd(), document.pdfFile))).toBe(true);
    },
  );
});
