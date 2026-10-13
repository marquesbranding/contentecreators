export type LegalDocumentType = "TERMS" | "PRIVACY" | "CONTACT_VISIBILITY";

export type LegalBlock =
  | {
      kind: "item";
      /** Official numbering, e.g. "4.3". Used for stable anchors. */
      number: string;
      text: string;
      bullets?: readonly string[];
    }
  | { kind: "paragraph"; text: string; bullets?: readonly string[] }
  | { kind: "subheading"; number?: string; text: string }
  | { kind: "callout"; text: string }
  | {
      kind: "table";
      caption: string;
      headers: readonly string[];
      rows: readonly (readonly string[])[];
    };

export type LegalChapter = {
  number: number;
  title: string;
  blocks: readonly LegalBlock[];
};

export type LegalSummaryRow = { question: string; answer: string };

export type LegalDocument = {
  documentType: Exclude<LegalDocumentType, "CONTACT_VISIBILITY">;
  title: string;
  versionLabel: string;
  /** ISO date (yyyy-mm-dd) the version was published. */
  publishedOn: string;
  updatedLabel: string;
  intro: readonly string[];
  summary?: readonly LegalSummaryRow[];
  chapters: readonly LegalChapter[];
  closing: readonly string[];
};
