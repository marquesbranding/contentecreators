import { publishedLegalVersions } from "@/features/legal/domain/legal-documents";

for (const version of publishedLegalVersions) {
  console.log(
    `${version.documentType}\t${version.versionLabel}\t${version.publishedOn}\t${version.contentHash}`,
  );
}
