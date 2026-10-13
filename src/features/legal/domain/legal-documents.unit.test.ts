import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  currentPrivacyDocument,
  currentTermsDocument,
  publishedLegalVersions,
} from "@/features/legal/domain/legal-documents";
import { isOfficialLegalVersion } from "@/features/legal/domain/legal-version";
import { hashLegalContent } from "@/features/legal/domain/legal-hash";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261013120000_official_legal_documents.sql",
  ),
  "utf8",
);

describe("official legal documents", () => {
  it.each(publishedLegalVersions)(
    "registers $documentType $versionLabel with the repository content hash",
    (version) => {
      expect(migration).toContain(
        `'${version.documentType}', '${version.versionLabel}', '${version.contentHash}'`,
      );
    },
  );

  it("hashes independently of key order", () => {
    expect(hashLegalContent({ a: 1, b: { c: 2, d: 3 } })).toBe(
      hashLegalContent({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  it("changes the hash when published text changes", () => {
    expect(
      hashLegalContent({ ...currentTermsDocument, intro: ["editado"] }),
    ).not.toBe(
      publishedLegalVersions.find((v) => v.documentType === "TERMS")
        ?.contentHash,
    );
  });

  it("carries the numbered items other clauses reference", () => {
    const numbers = currentTermsDocument.chapters
      .flatMap((chapter) => chapter.blocks)
      .flatMap((block) => (block.kind === "item" ? [block.number] : []));

    expect(numbers).toEqual(expect.arrayContaining(["4.3", "10.3", "11.3"]));
    expect(currentTermsDocument.chapters).toHaveLength(13);
    expect(currentPrivacyDocument.chapters).toHaveLength(13);
  });

  it("flags placeholder versions as unofficial", () => {
    expect(isOfficialLegalVersion("LOCAL-PLACEHOLDER-v1")).toBe(false);
    expect(isOfficialLegalVersion("1.0")).toBe(true);
  });
});
