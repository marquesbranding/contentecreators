import { listPublishedLegalVersions } from "@/features/legal/domain/legal-documents";

for (const version of listPublishedLegalVersions()) {
  console.log(
    `${version.documentType}\t${version.versionLabel}\t${version.publishedOn}\t${version.contentHash}`,
  );
}
