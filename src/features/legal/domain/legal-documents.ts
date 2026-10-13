import { contactVisibilityV1_0 } from "@/features/legal/content/contact-visibility.v1_0";
import { privacyV1_0 } from "@/features/legal/content/privacy.v1_0";
import { termsV1_0 } from "@/features/legal/content/terms.v1_0";
import { hashLegalContent } from "@/features/legal/domain/legal-hash";
import type {
  LegalDocument,
  LegalDocumentType,
} from "@/features/legal/types/legal-document.types";

export type PublishedLegalVersion = {
  documentType: LegalDocumentType;
  versionLabel: string;
  publishedOn: string;
  contentHash: string;
};

export const currentTermsDocument: LegalDocument = termsV1_0;
export const currentPrivacyDocument: LegalDocument = privacyV1_0;

export const publishedLegalVersions: readonly PublishedLegalVersion[] = [
  termsV1_0,
  privacyV1_0,
  contactVisibilityV1_0,
].map((document) => ({
  documentType: document.documentType,
  versionLabel: document.versionLabel,
  publishedOn: document.publishedOn,
  contentHash: hashLegalContent(document),
}));
