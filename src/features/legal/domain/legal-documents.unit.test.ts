import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { listPublishedLegalVersions } from "@/features/legal/domain/legal-documents";
import { hashLegalContent } from "@/features/legal/domain/legal-hash";
import { isOfficialLegalVersion } from "@/features/legal/domain/legal-version";

const migrationsDirectory = join(process.cwd(), "supabase/migrations");
const migrations = [
  "20261013120000_official_legal_documents.sql",
  "20261013140000_legal_documents_pdf_hashes.sql",
]
  .map((name) => readFileSync(join(migrationsDirectory, name), "utf8"))
  .join("\n");

describe("official legal documents", () => {
  it.each(listPublishedLegalVersions())(
    "registers $documentType $versionLabel with the published file hash",
    (version) => {
      expect(migrations).toContain(version.contentHash);
    },
  );

  it("hashes independently of key order", () => {
    expect(hashLegalContent({ a: 1, b: { c: 2, d: 3 } })).toBe(
      hashLegalContent({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  it("flags placeholder versions as unofficial", () => {
    expect(isOfficialLegalVersion("LOCAL-PLACEHOLDER-v1")).toBe(false);
    expect(isOfficialLegalVersion("1.0")).toBe(true);
  });
});
